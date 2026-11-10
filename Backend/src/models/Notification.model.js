const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  title: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  message: { type: String, required: [true, 'El mensaje es obligatorio'], trim: true },
  type: { 
    type: String, 
    enum: ['order', 'incident', 'system', 'promo'], 
    default: 'system' 
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

// Los empleados ya no tienen bandeja de notificaciones en la app: sus avisos llegan a su correo.
notificationSchema.post('save', async function (doc) {
  if (!doc.$locals?.isNewDoc && !doc.wasNew) return;
  try {
    const User = mongoose.model('User');
    const user = await User.findById(doc.userId).select('email role status');
    if (!user || user.role !== 'employee' || user.status !== 'active') return;
    const { getSettings } = require('../utils/settings');
    if ((await getSettings()).emailNotifications === false) return;
    await require('../utils/mailer').sendMail({ to: user.email, subject: doc.title, text: doc.message });
  } catch (error) {
    console.error('Error al enviar la notificación por correo:', error.message);
  }
});
notificationSchema.pre('save', function () { this.wasNew = this.isNew; });

module.exports = mongoose.model('Notification', notificationSchema);
