const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, trim: true, default: 'Otro' },
  concept: { type: String, required: [true, 'El concepto es obligatorio'], trim: true },
  amount: { type: Number, required: [true, 'El monto es obligatorio'], min: 0 },
  commissionAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);