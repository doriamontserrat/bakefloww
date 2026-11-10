const User = require('../models/User.model');
const Bakery = require('../models/Bakery.model');
const Order = require('../models/Order.model');
const Notification = require('../models/Notification.model');
const Incident = require('../models/Incident.model');
const { ACTIVE_STATUSES, deleteBakeryCascade } = require('../utils/cascade');
const v = require('../utils/validators');
const { pick, publicUser, canAccessBakery, notFound, forbidden } = require('../utils/access');

// Admin: todos (filtro ?role=). Pastelería: solo los empleados de su pastelería.
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'bakery') {
      if (!req.user.bakeryId) return res.json({ ok: true, users: [] });
      filter.bakeryId = req.user.bakeryId;
      filter.role = 'employee';
    } else if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).populate('bakeryId', 'name');
    res.json({ ok: true, users });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios' });
  }
};

// Admin: crear cualquier tipo de usuario. Pastelería => crea también su Bakery (bakeryName);
// empleado => se vincula a una pastelería existente (bakeryId o bakeryName exacto).
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, bakeryName } = req.body;
    if (!['customer', 'bakery', 'employee', 'admin'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'Rol inválido.' });
    }
    const invalid = v.firstError(v.validateName(name), v.validateEmail(email), v.validatePassword(password), v.validatePhone(phone),
      role === 'bakery' && bakeryName ? v.validateTitle(bakeryName, 'El nombre de la pastelería') : '');
    if (invalid) return res.status(400).json({ ok: false, message: invalid });

    let bakeryId = null;
    if (role === 'employee') {
      const bakery = req.body.bakeryId
        ? await Bakery.findById(req.body.bakeryId)
        : await Bakery.findOne({ name: new RegExp('^' + String(bakeryName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
      if (!bakery) return res.status(400).json({ ok: false, message: 'Indica una pastelería existente para el empleado.' });
      bakeryId = bakery._id;
    }

    const user = await User.create({ name, email, password, phone, role, bakeryId });
    if (role === 'bakery') {
      try {
        const bakery = await Bakery.create({ name: String(bakeryName || '').trim() || name, phone: phone || '', ownerId: user._id });
        user.bakeryId = bakery._id;
        await user.save();
      } catch (bakeryError) {
        await User.findByIdAndDelete(user._id);
        throw bakeryError;
      }
    }
    res.status(201).json({ ok: true, message: 'Usuario creado', user: publicUser(user) });
  } catch (error) {
    const duplicated = error.code === 11000;
    res.status(400).json({
      ok: false,
      message: duplicated ? 'Este correo ya está registrado.' : 'Error al crear usuario',
      error: duplicated ? undefined : error.message
    });
  }
};

// Reconfirmar identidad antes de acciones destructivas: correo y contraseña del usuario en sesión
exports.verifyCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    const valid =
      typeof email === 'string' && typeof password === 'string' &&
      user && user.email === email.trim().toLowerCase() && (await user.comparePassword(password));
    // 403 (no 401): un 401 el frontend lo interpreta como sesión vencida y cerraría la sesión
    if (!valid) return res.status(403).json({ ok: false, message: 'Credenciales incorrectas.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al validar las credenciales' });
  }
};

// Actualizar perfil propio: solo se modifican los campos enviados
exports.updateProfile = async (req, res) => {
  try {
    const data = pick(req.body, ['name', 'phone', 'address', 'birthday', 'profilePhoto']);
    const invalid = v.validateProfileFields(data);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    if ('birthday' in data) data.birthday = data.birthday || null;
    const user = await User.findByIdAndUpdate(req.user.id, data, { new: true, runValidators: true });
    res.json({ ok: true, message: 'Perfil actualizado', user });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar perfil', error: error.message });
  }
};

// Cambiar contraseña propia verificando la actual
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ ok: false, message: 'Contraseña actual y nueva son obligatorias.' });
    }
    const invalid = v.validatePassword(newPassword);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ ok: false, message: 'La contraseña actual es incorrecta.' });
    }
    user.password = newPassword; // el hook pre('save') la encripta
    await user.save();
    res.json({ ok: true, message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al cambiar la contraseña' });
  }
};

// Registrar tarjeta del cliente
exports.addCard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.savedCards.push(pick(req.body, ['cardHolder', 'last4', 'brand', 'expiryDate']));
    await user.save();
    res.status(201).json({ ok: true, message: 'Tarjeta registrada', savedCards: user.savedCards });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al guardar tarjeta', error: error.message });
  }
};

// Eliminar tarjeta del cliente
exports.removeCard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.savedCards = user.savedCards.filter(c => c._id.toString() !== req.params.cardId);
    await user.save();
    res.json({ ok: true, message: 'Tarjeta eliminada', savedCards: user.savedCards });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar tarjeta' });
  }
};

// Pastelería (o admin indicando bakeryId): crear empleado
exports.createEmployee = async (req, res) => {
  try {
    const bakeryId = req.user.role === 'admin' ? req.body.bakeryId : req.user.bakeryId;
    if (!bakeryId) {
      return res.status(400).json({ ok: false, message: 'No hay pastelería asociada para el empleado.' });
    }
    const { name, email, password, phone, jobTitle } = req.body;
    const invalid = v.firstError(v.validateName(name), v.validateEmail(email), v.validatePassword(password), v.validatePhone(phone));
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    const employee = await User.create({ name, email, password, phone, jobTitle, role: 'employee', bakeryId });
    res.status(201).json({ ok: true, message: 'Empleado registrado en la pastelería', employee: publicUser(employee) });
  } catch (error) {
    const duplicated = error.code === 11000;
    res.status(400).json({
      ok: false,
      message: duplicated ? 'Este correo ya está registrado.' : 'Error al crear empleado',
      error: duplicated ? undefined : error.message
    });
  }
};

// Pastelería (o admin): editar un empleado propio (datos, puesto y suspender/activar)
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== 'employee') return notFound(res, 'Empleado no encontrado');
    if (!canAccessBakery(req.user, employee.bakeryId)) return forbidden(res);

    const data = pick(req.body, ['name', 'phone', 'jobTitle', 'status']);
    const invalid = v.validateProfileFields(data);
    if (invalid) return res.status(400).json({ ok: false, message: invalid });
    if (data.status && !['active', 'suspended'].includes(data.status)) {
      return res.status(400).json({ ok: false, message: 'Estado inválido.' });
    }
    employee.set(data);
    await employee.save();
    res.json({ ok: true, message: 'Empleado actualizado', employee: publicUser(employee) });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar empleado', error: error.message });
  }
};

// Empleado: confirma con las credenciales del dueño de SU pastelería (autorización de supervisor)
exports.authorizeSupervisor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ ok: false, message: 'Correo y contraseña son obligatorios.' });
    }
    const supervisor = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const valid =
      supervisor &&
      supervisor.role === 'bakery' &&
      supervisor.status === 'active' &&
      req.user.bakeryId &&
      String(supervisor.bakeryId) === String(req.user.bakeryId) &&
      (await supervisor.comparePassword(password));
    if (!valid) return res.status(403).json({ ok: false, message: 'Usuario o contraseña de la pastelería incorrectos.' });
    res.json({ ok: true, message: 'Autorizado' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al validar la autorización' });
  }
};

// Admin: cambiar estado de cuenta (active, suspended, blocked) o rol
exports.updateUserStatus = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return forbidden(res, 'No puedes cambiar tu propio estado o rol.');
    }
    const user = await User.findByIdAndUpdate(req.params.id, pick(req.body, ['status', 'role']), {
      new: true,
      runValidators: true
    });
    if (!user) return notFound(res, 'Usuario no encontrado');
    res.json({ ok: true, message: 'Usuario actualizado por el administrador', user });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar usuario', error: error.message });
  }
};

// Admin: cualquiera (menos sí mismo). Pastelería: solo empleados de su pastelería.
exports.deleteUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return forbidden(res, 'No puedes eliminar tu propia cuenta.');
    }
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'Usuario no encontrado');

    if (req.user.role !== 'admin') {
      const isMyEmployee =
        user.role === 'employee' && req.user.bakeryId && String(user.bakeryId) === String(req.user.bakeryId);
      if (!isMyEmployee) return forbidden(res);
    }

    // Limpieza de lo que depende del usuario para no dejar registros huérfanos
    if (user.role === 'customer') {
      const active = await Order.countDocuments({ customerId: user._id, status: { $in: ACTIVE_STATUSES } });
      if (active) {
        return res.status(409).json({ ok: false, message: `El cliente tiene ${active} pedido(s) en curso. Cancélalos o espera a que terminen antes de eliminarlo.` });
      }
      await Order.updateMany({ customerId: user._id }, { customerId: null }); // el historial de la pastelería se conserva
    } else if (user.role === 'employee') {
      await Order.updateMany({ assignedEmployeeId: user._id }, { assignedEmployeeId: null });
    } else if (user.role === 'bakery') {
      const bakery = await Bakery.findOne({ $or: [{ ownerId: user._id }, { _id: user.bakeryId }] });
      if (bakery) await deleteBakeryCascade(bakery);
    }
    await Notification.deleteMany({ userId: user._id });
    await Incident.deleteMany({ reportedBy: user._id });
    await user.deleteOne();
    res.json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar usuario' });
  }
};
