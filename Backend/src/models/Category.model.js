const mongoose = require('mongoose');

// Cada pastelería administra sus propias categorías. bakeryId = null son las categorías globales históricas (solo lectura).
const categorySchema = new mongoose.Schema({
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', default: null },
  name: { type: String, required: [true, 'El nombre de la categoría es obligatorio'], trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'Cake' }, // nombre del icono que se muestra en el panel
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// El nombre es único dentro de cada pastelería (no en toda la plataforma)
categorySchema.index({ bakeryId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
