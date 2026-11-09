const mongoose = require('mongoose');

// Cobros de la plataforma a las pastelerías (suscripciones). Las comisiones salen de Finance.
const paymentSchema = new mongoose.Schema({
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', required: true },
  type: { type: String, enum: ['subscription'], default: 'subscription' },
  plan: { type: String, enum: ['basic', 'pro', 'enterprise'], required: true },
  concept: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);