const Bakery = require('../models/Bakery.model');
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const Plan = require('../models/Plan.model');
const Payment = require('../models/Payment.model');
const { pick, canAccessBakery, forbidden, notFound } = require('../utils/access');

// Campos que puede editar la propia pastelería
const OWNER_FIELDS = ['name', 'description', 'address', 'phone', 'logoUrl', 'allowsCustomCakes'];
// Campos reservados al administrador (estado, suscripción, comisión)
const ADMIN_FIELDS = [...OWNER_FIELDS, 'status', 'subscription', 'commissionRate'];

// Listado público: solo pastelerías activas y sin datos del dueño. El admin ve todo (?all=true).
exports.getBakeries = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const filter = isAdmin && req.query.all === 'true' ? {} : { status: 'active' };
    let query = Bakery.find(filter);
    if (isAdmin) query = query.populate('ownerId', 'name email phone');
    let bakeries = await query;
    if (isAdmin) {
      // El panel admin muestra cuántos pedidos tiene cada pastelería
      const counts = await Order.aggregate([{ $group: { _id: '$bakeryId', n: { $sum: 1 } } }]);
      const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
      bakeries = bakeries.map((b) => ({ ...b.toObject(), ordersCount: byId[String(b._id)] || 0 }));
    }
    res.json({ ok: true, bakeries });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener pastelerías' });
  }
};

exports.getBakeryById = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let query = Bakery.findById(req.params.id);
    if (isAdmin) query = query.populate('ownerId', 'name email');
    const bakery = await query;
    if (!bakery) return notFound(res, 'Pastelería no encontrada');
    if (bakery.status !== 'active' && !(req.user && canAccessBakery(req.user, bakery._id))) {
      return notFound(res, 'Pastelería no encontrada');
    }
    res.json({ ok: true, bakery });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al obtener pastelería' });
  }
};

// Crear pastelería y vincularla al usuario dueño
exports.createBakery = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const ownerId = isAdmin ? req.body.ownerId : req.user.id;
    if (!ownerId) return res.status(400).json({ ok: false, message: 'Falta el ownerId de la pastelería.' });

    const owner = await User.findById(ownerId);
    if (!owner) return notFound(res, 'Usuario dueño no encontrado');
    if (owner.bakeryId) return res.status(400).json({ ok: false, message: 'El usuario ya tiene una pastelería.' });

    const bakery = await Bakery.create({ ...pick(req.body, OWNER_FIELDS), ownerId });
    owner.bakeryId = bakery._id;
    await owner.save();
    res.status(201).json({ ok: true, message: 'Pastelería creada exitosamente', bakery });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear pastelería', error: error.message });
  }
};

// Actualizar datos; estado, suscripción y comisión solo los cambia el admin
exports.updateBakery = async (req, res) => {
  try {
    const bakery = await Bakery.findById(req.params.id);
    if (!bakery) return notFound(res, 'Pastelería no encontrada');
    if (!canAccessBakery(req.user, bakery._id)) return forbidden(res);

    bakery.set(pick(req.body, req.user.role === 'admin' ? ADMIN_FIELDS : OWNER_FIELDS));
    await bakery.save();
    res.json({ ok: true, message: 'Pastelería actualizada', bakery });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar pastelería', error: error.message });
  }
};

// Cambiar de plan (o cancelar) la suscripción. El cobro es simulado: se registra un Payment.
// Dueño de la pastelería o admin.
exports.updateSubscription = async (req, res) => {
  try {
    const bakery = await Bakery.findById(req.params.id);
    if (!bakery) return notFound(res, 'Pastelería no encontrada');
    if (!canAccessBakery(req.user, bakery._id)) return forbidden(res);

    if (req.body.action === 'cancel') {
      bakery.subscription = { plan: 'basic', status: 'cancelled', price: 0, expiresAt: null };
      await bakery.save();
      return res.json({ ok: true, message: 'Suscripción cancelada', bakery });
    }

    const plan = await Plan.findOne({ key: req.body.plan, isActive: true });
    if (!plan) return res.status(400).json({ ok: false, message: 'Plan no válido.' });

    bakery.subscription = {
      plan: plan.key, status: 'active', price: plan.price,
      expiresAt: plan.price > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
    };
    await bakery.save();
    if (plan.price > 0) {
      const month = new Date().toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
      await Payment.create({ bakeryId: bakery._id, plan: plan.key, amount: plan.price, concept: `Plan ${plan.name} - ${month}` });
    }
    res.json({ ok: true, message: 'Suscripción actualizada', bakery });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar la suscripción' });
  }
};

// Eliminar pastelería (Admin): también borra su menú y sus empleados, y libera al dueño
exports.deleteBakery = async (req, res) => {
  try {
    const bakery = await Bakery.findByIdAndDelete(req.params.id);
    if (!bakery) return notFound(res, 'Pastelería no encontrada');
    await Product.deleteMany({ bakeryId: bakery._id });
    await User.deleteMany({ bakeryId: bakery._id, role: 'employee' });
    await User.updateMany({ bakeryId: bakery._id }, { bakeryId: null });
    res.json({ ok: true, message: 'Pastelería eliminada' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar pastelería' });
  }
};
