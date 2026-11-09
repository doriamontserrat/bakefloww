const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre de la categoría es obligatorio'], unique: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'Cake' }, // nombre del icono que muestra el panel admin
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);