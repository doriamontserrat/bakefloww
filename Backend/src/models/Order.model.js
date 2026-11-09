const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Las ventas de mostrador pueden no tener cliente registrado
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, required: function () { return !this.isPointOfSale; } },
  bakeryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bakery', required: true },
  assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  orderType: { type: String, enum: ['standard', 'custom'], default: 'standard' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true },
    size: { type: String, default: '' }
  }],
  customDetails: {
    size: { type: String, default: '' },
    flavor: { type: String, default: '' },
    filling: { type: String, default: '' },
    designDescription: { type: String, default: '' },
    referenceImageUrl: { type: String, default: '' },
    specialInstructions: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    quotedPrice: { type: Number, default: 0 },
    // Datos del asistente de pedido personalizado
    frosting: { type: String, default: '' },
    decorations: { type: String, default: '' },
    theme: { type: String, default: '' },
    message: { type: String, default: '' },
    persons: { type: String, default: '' },
    budget: { type: String, default: '' },
    // Motivo cuando la pastelería rechaza la solicitud
    bakeryNote: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['pending_quote', 'awaiting_client', 'rejected', 'declined', 'pending', 'in_preparation', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryDate: { type: Date, required: [true, 'La fecha de entrega es obligatoria'] },
  totalPrice: { type: Number, required: true, default: 0 },
  platformCommission: { type: Number, default: 0 },
  isPointOfSale: { type: Boolean, default: false }, // ¿Fue venta en el local?
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'pending'], default: 'pending' },
  deliveryAddress: { type: String, default: '' },
  cardLast4: { type: String, default: '' },
  deliveryMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);