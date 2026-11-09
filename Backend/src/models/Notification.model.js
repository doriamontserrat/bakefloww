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

module.exports = mongoose.model('Notification', notificationSchema);
