const Order = require('../models/Order.model');
const Notification = require('../models/Notification.model');
const Finance = require('../models/Finance.model');
const Incident = require('../models/Incident.model');
const Product = require('../models/Product.model');
const Payment = require('../models/Payment.model');
const User = require('../models/User.model');
const Bakery = require('../models/Bakery.model');

// Pedidos que aún están en curso (no terminados ni cancelados)
const ACTIVE_STATUSES = ['pending_quote', 'awaiting_client', 'pending', 'in_preparation', 'prepared', 'ready'];

// Limpia lo que cuelga de unos pedidos. Las finanzas se conservan (contabilidad) sin el vínculo.
async function removeOrderRefs(orderIds) {
  if (!orderIds.length) return;
  await Notification.deleteMany({ orderId: { $in: orderIds } });
  await Incident.updateMany({ orderId: { $in: orderIds } }, { orderId: null });
  await Finance.updateMany({ orderId: { $in: orderIds } }, { orderId: null });
}

// Borra una pastelería con todo lo suyo: menú, empleados, pedidos, finanzas, cobros e incidencias.
async function deleteBakeryCascade(bakery) {
  const id = bakery._id;
  const orderIds = (await Order.find({ bakeryId: id }).select('_id')).map((o) => o._id);
  await removeOrderRefs(orderIds);
  await Order.deleteMany({ bakeryId: id });
  await Finance.deleteMany({ bakeryId: id });
  await Payment.deleteMany({ bakeryId: id });
  await Incident.updateMany({ bakeryId: id }, { bakeryId: null });
  await Product.deleteMany({ bakeryId: id });
  const employees = (await User.find({ bakeryId: id, role: 'employee' }).select('_id')).map((u) => u._id);
  await Notification.deleteMany({ userId: { $in: employees } });
  await User.deleteMany({ _id: { $in: employees } });
  await User.updateMany({ bakeryId: id }, { bakeryId: null });
  await Bakery.deleteOne({ _id: id });
}

module.exports = { ACTIVE_STATUSES, removeOrderRefs, deleteBakeryCascade };
