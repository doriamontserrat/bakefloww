const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedCardSchema = new mongoose.Schema({
  cardHolder: { type: String, required: true, trim: true },
  last4: { type: String, required: true, match: /^\d{4}$/ }, // Solo últimos 4 dígitos por seguridad
  brand: { type: String, default: 'Visa' },
  expiryDate: { type: String, required: true } // MM/YY
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El correo es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6,
    select: false // No devuelve la contraseña en las consultas por defecto
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  birthday: {
    type: Date,
    default: null
  },
  // Puesto del empleado dentro de la pastelería (Pastelera, Decoradora, ...)
  jobTitle: { type: String, trim: true, default: '' },
  profilePhoto: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['customer', 'bakery', 'employee', 'admin'],
    default: 'customer'
  },
  // Si es dueño o empleado, a qué pastelería pertenece
  bakeryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bakery',
    default: null
  },
  // Para que el Admin pueda suspender o bloquear cuentas que incumplan normas
  status: {
    type: String,
    enum: ['active', 'suspended', 'blocked'],
    default: 'active'
  },
  // Tarjetas registradas del cliente
  savedCards: [savedCardSchema]
}, {
  timestamps: true
});

// Encriptar contraseña automáticamente antes de guardar (CORREGIDO)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar la contraseña al iniciar sesión
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);