const mongoose = require('mongoose');

const bakerySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre de la pastelería es obligatorio'], trim: true },
  description: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  allowsCustomCakes: { type: Boolean, default: true },
  subscription: {
    plan: { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    price: { type: Number, default: 0 },
    // true = el usuario pidió cancelar/bajar a gratuito: conserva el plan pagado hasta expiresAt y no se renueva
    cancelAtPeriodEnd: { type: Boolean, default: false },
    expiresAt: { type: Date, default: () => new Date(+new Date() + 30*24*60*60*1000) }
  },
  commissionRate: { type: Number, default: 0.08 } // 8% comisión de BakeFlow
}, { timestamps: true });

module.exports = mongoose.model('Bakery', bakerySchema);