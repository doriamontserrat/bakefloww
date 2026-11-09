const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  name: { type: String, required: [true, 'El nombre del pastel es obligatorio'], trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: [true, 'El precio es obligatorio'], min: 0 },
  imageUrl: { type: String, default: '' },
  sizes: [{ type: String }], // Ej: ["Chico (10 personas)", "Mediano (20 personas)"]
  flavors: [{ type: String }], // Ej: ["Vainilla", "Chocolate", "Red Velvet"]
  stock: { type: Number, default: 0 }, 
  isAvailable: { type: Boolean, default: true }
  
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);