const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const { notFound, forbidden } = require('../utils/access');

const TYPES = ['order', 'incident', 'system', 'promo'];

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ ok: true, notifications });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener notificaciones' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ ok: true, count });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al contar notificaciones' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al actualizar notificaciones' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return notFound(res, 'Notificación no encontrada');
    res.json({ ok: true, notification });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar notificación' });
  }
};

// Obtener TODAS las notificaciones del sistema (solo Admin)
exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ ok: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener todas las notificaciones' });
  }
};

// Admin: a cualquiera. Pastelería/empleado: a su personal o a clientes con pedidos en su pastelería.
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ ok: false, message: 'userId, title y message son obligatorios' });
    }
    if (type && !TYPES.includes(type)) {
      return res.status(400).json({ ok: false, message: 'Tipo de notificación inválido' });
    }

    const target = await User.findById(userId);
    if (!target) return notFound(res, 'Usuario destinatario no encontrado');

    if (req.user.role !== 'admin') {
      const sameBakery = req.user.bakeryId && String(target.bakeryId) === String(req.user.bakeryId);
      const isMyCustomer =
        req.user.bakeryId && (await Order.exists({ customerId: target._id, bakeryId: req.user.bakeryId }));
      if (!sameBakery && !isMyCustomer) return forbidden(res, 'No puedes notificar a este usuario.');
    }

    const notification = await Notification.create({ userId, title, message, type: type || 'system' });
    res.status(201).json({ ok: true, message: 'Notificación creada exitosamente', notification });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear la notificación' });
  }
};
