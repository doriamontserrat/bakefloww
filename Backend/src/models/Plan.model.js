const mongoose = require('mongoose');

// Catálogo de planes de suscripción. key coincide con Bakery.subscription.plan
const planSchema = new mongoose.Schema({
  key: { type: String, enum: ['basic', 'pro', 'enterprise'], required: true, unique: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  features: [{ type: String }],
  maxOrdersPerMonth: { type: Number, default: null }, // null = ilimitados
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const DEFAULT_PLANS = [
  { key: 'basic', name: 'Gratuito', price: 0, maxOrdersPerMonth: 10, features: ['Hasta 10 pedidos al mes', 'Calendario', 'Gestión básica de pedidos'] },
  { key: 'pro', name: 'Pro', price: 199, maxOrdersPerMonth: null, features: ['Pedidos ilimitados', 'Control financiero', 'Estadísticas', 'Empleados'] },
  { key: 'enterprise', name: 'Premium', price: 299, maxOrdersPerMonth: null, features: ['Todo lo de Pro', 'Reportes avanzados', 'Automatizaciones'] }
];

// Crea los planes que falten (no pisa cambios hechos por el admin)
planSchema.statics.ensureDefaults = async function () {
  for (const plan of DEFAULT_PLANS) {
    await this.updateOne({ key: plan.key }, { $setOnInsert: plan }, { upsert: true });
  }
};

module.exports = mongoose.model('Plan', planSchema);