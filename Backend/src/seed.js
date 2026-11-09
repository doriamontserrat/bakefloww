// Datos demo idempotentes: crea (si no existen) las cuentas que usa el botón "demo" del login.
// Uso: npm run seed   (bloqueado con NODE_ENV=production)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User.model');
const Bakery = require('./models/Bakery.model');
const Category = require('./models/Category.model');
const Product = require('./models/Product.model');
const Plan = require('./models/Plan.model');
const Setting = require('./models/Setting.model');

const DEMO_PASSWORD = 'demo123';

async function findOrCreateUser(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) return existing;
  return User.create({ password: DEMO_PASSWORD, ...data });
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Seed bloqueado: NODE_ENV=production');
    process.exit(1);
  }
  await connectDB();
  await Plan.ensureDefaults();
  await Setting.getSingleton();

  const admin = await findOrCreateUser({ name: 'Admin BakeFlow', email: 'admin@bakeflow.com', role: 'admin' });
  const customer = await findOrCreateUser({ name: 'Luna García', email: 'luna@mail.com', role: 'customer' });

  const owner = await findOrCreateUser({ name: 'Dulcería Rosita', email: 'dulceria@mail.com', role: 'bakery' });
  let bakery = owner.bakeryId ? await Bakery.findById(owner.bakeryId) : null;
  if (!bakery) {
    bakery = await Bakery.create({ name: 'Dulcería Rosita', address: 'Centro', phone: '5550000000', ownerId: owner._id });
    owner.bakeryId = bakery._id;
    await owner.save();
  }

  await findOrCreateUser({ name: 'Sofía López', email: 'sofia@mail.com', role: 'employee', bakeryId: bakery._id });

  const categories = {};
  for (const name of ['Pasteles', 'Cupcakes', 'Postres']) {
    categories[name] = (await Category.findOne({ name })) || (await Category.create({ name }));
  }

  if ((await Product.countDocuments({ bakeryId: bakery._id })) === 0) {
    await Product.create([
      { bakeryId: bakery._id, categoryId: categories.Pasteles._id, name: 'Pastel de fresa', price: 320, stock: 10, sizes: ['Mediano'] },
      { bakeryId: bakery._id, categoryId: categories.Pasteles._id, name: 'Red Velvet', price: 480, stock: 10, sizes: ['Mediano', 'Grande'] },
      { bakeryId: bakery._id, categoryId: categories.Cupcakes._id, name: 'Cupcake de vainilla', price: 45, stock: 40 },
      { bakeryId: bakery._id, categoryId: categories.Postres._id, name: 'Cheesecake de maracuyá', price: 380, stock: 8 },
    ]);
  }

  console.log(`Seed listo. Cuentas demo (${admin.email}, ${customer.email}, ${owner.email}, sofia@mail.com) con contraseña "${DEMO_PASSWORD}".`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
