const mongoose = require('mongoose');

// Configuración global de la plataforma: un único documento (singleton)
const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'BakeFlow', trim: true },
  supportEmail: { type: String, default: 'soporte@bakeflow.com', trim: true },
  commissionRate: { type: Number, default: 8, min: 0, max: 100 }, // porcentaje sobre cada venta
  maxFreeOrders: { type: Number, default: 10, min: 0 },           // pedidos/mes del plan gratuito
  maintenanceMode: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  autoRenew: { type: Boolean, default: true },
  welcomeBonus: { type: Boolean, default: false }                 // 1 mes Pro gratis a pastelerías nuevas
}, { timestamps: true });

settingSchema.statics.getSingleton = async function () {
  return (await this.findOne()) || (await this.create({}));
};

module.exports = mongoose.model('Setting', settingSchema);