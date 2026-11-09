const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type: { type: String, enum: ['report', 'fraud', 'complaint', 'technical', 'payment', 'other'], default: 'report' },
  title: { type: String, required: [true, 'El título es obligatorio'], trim: true },
  description: { type: String, required: [true, 'La descripción es obligatoria'] },
  status: { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open' },
  adminResolution: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);