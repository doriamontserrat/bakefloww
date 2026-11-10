const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Bakery = require('../models/Bakery.model');
const { getSettings } = require('../utils/settings');
const { planInfoFor } = require('../utils/plans');

// Generar JWT firmado
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, bakeryId: user.bakeryId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// 1. Registro de usuario
exports.register = async (req, res) => {
  try {
    const { name, password, phone, address, birthday, profilePhoto, bakeryName, role } = req.body;
    const email = String(req.body.email).trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'Este correo ya está registrado.' });
    }

    // Por seguridad, solo permitimos registrarse libremente como customer o bakery
    const safeRole = ['customer', 'bakery'].includes(role) ? role : 'customer';

    const newUser = await User.create({
      name,
      email,
      password,
      phone,
      address,
      birthday: birthday || null,
      profilePhoto,
      role: safeRole
    });

    // Si se registra una pastelería, se crea su registro y se enlaza al dueño
    if (safeRole === 'bakery') {
      try {
        const bakery = await Bakery.create({
          name: bakeryName || name,
          address: address || '',
          phone: phone || '',
          ownerId: newUser._id,
          // Bono de bienvenida configurable por el admin: 1 mes de plan Pro gratis
          ...((await getSettings()).welcomeBonus && {
            subscription: { plan: 'pro', status: 'active', price: 0, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
          })
        });
        newUser.bakeryId = bakery._id;
        await newUser.save();
      } catch (bakeryError) {
        await User.findByIdAndDelete(newUser._id);
        throw bakeryError;
      }
    }

    const token = signToken(newUser);

    res.status(201).json({
      ok: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        bakeryId: newUser.bakeryId,
        plan: await planInfoFor(newUser)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al registrar usuario' });
  }
};

// 2. Iniciar sesión (Login)
exports.login = async (req, res) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const { password } = req.body;

    // Buscamos el usuario e incluimos el password para compararlo
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ ok: false, message: `Cuenta ${user.status}. Acceso denegado.` });
    }

    const token = signToken(user);

    res.status(200).json({
      ok: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bakeryId: user.bakeryId,
        plan: await planInfoFor(user)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al iniciar sesión' });
  }
};

// 3. Obtener perfil del usuario actual
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ ok: true, user, plan: await planInfoFor(user) });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener perfil' });
  }
};