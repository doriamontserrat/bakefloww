const Order = require('../models/Order.model');
const Notification = require('../models/Notification.model');
const Finance = require('../models/Finance.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');
const Bakery = require('../models/Bakery.model');
const { pick, canAccessBakery, forbidden, notFound } = require('../utils/access');
const { getSettings, getCommissionRate } = require('../utils/settings');
const Plan = require('../models/Plan.model');
const { deductStock, restoreStock } = require('../utils/stock');
const { removeOrderRefs } = require('../utils/cascade');
const { resolvePlanKey } =require('../utils/plans');

const STATUSES = Order.schema.path('status').enumValues;
const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'pending'];
const CUSTOM_DETAIL_FIELDS = [
  'size', 'flavor', 'filling', 'designDescription', 'referenceImageUrl', 'specialInstructions', 'isApproved', 'quotedPrice',
  'frosting', 'decorations', 'theme', 'message', 'persons', 'budget'
];
// Estados del ciclo de cotización de un pedido personalizado: solo se mueven con quote/reject/respond
// Estados que cierran el pedido sin venderlo: liberan el stock y ya no se pueden reabrir
const RELEASE_STATUSES = ['cancelled', 'rejected', 'declined'];
const QUOTE_FLOW = ['pending_quote', 'awaiting_client', 'rejected', 'declined'];

// La tasa de comisión la define el admin en la configuración de la plataforma
const commissionOf = async (total) => +(total * (await getCommissionRate())).toFixed(2);

// Obtener pedidos filtrados según el rol del usuario
exports.getOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'customer') filter.customerId = req.user.id;

    // Pastelería o empleado: solo los pedidos de su negocio (sin pastelería => ninguno)
    if (req.user.role === 'bakery' || req.user.role === 'employee') {
      if (!req.user.bakeryId) return res.json({ ok: true, orders: [] });
      filter.bakeryId = req.user.bakeryId;
    }

    // Empleado: solo los pedidos que le fueron asignados
    if (req.user.role === 'employee') filter.assignedEmployeeId = req.user.id;

    // Admin: todos, o los de una pastelería concreta por query
    if (req.user.role === 'admin' && req.query.bakeryId) filter.bakeryId = req.query.bakeryId;

    // Filtros opcionales: ?status=ready,delivered  ?from=2026-09-01  ?to=2026-09-30 (fecha de entrega)
    if (req.query.type === 'custom' || req.query.type === 'standard') filter.orderType = req.query.type;
    if (req.query.status) {
      const list = String(req.query.status).split(',').filter((s) => STATUSES.includes(s));
      if (list.length) filter.status = { $in: list };
    }
    if (req.query.from || req.query.to) {
      filter.deliveryDate = {};
      if (req.query.from) filter.deliveryDate.$gte = new Date(req.query.from);
      if (req.query.to) filter.deliveryDate.$lte = new Date(req.query.to);
    }

    const orders = await Order.find(filter)
      .populate('customerId', 'name email phone')
      .populate('bakeryId', 'name phone')
      .populate('assignedEmployeeId', 'name email')
      .sort({ deliveryDate: 1 });

    res.json({ ok: true, orders });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al obtener pedidos' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { bakeryId, orderType, items, customDetails, deliveryDate, customerId, deliveryMethod } = req.body;
    const isStaff = ['bakery', 'employee', 'admin'].includes(req.user.role);
    // Solo el personal puede registrar ventas de mostrador
    const isPointOfSale = isStaff && req.body.isPointOfSale === true;
    // En una pastelería solo la cajera (empleada con puesto "Cajera") registra ventas de mostrador
    if (isPointOfSale && req.user.role === 'employee' && req.user.jobTitle !== 'Cajera') {
      return res.status(403).json({ ok: false, message: 'Solo las cajeras pueden registrar ventas.' });
    }
    const type = orderType === 'custom' ? 'custom' : 'standard';
    const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'pending';

    // 1. Cliente del pedido. En ventas de mostrador es opcional: se puede indicar por customerId o
    //    por correo (customerEmail); si no hay cliente registrado, la venta queda anónima.
    let finalCustomerId = null;
    if (req.user.role === 'customer') {
      finalCustomerId = req.user.id;
    } else if (customerId || req.body.customerEmail) {
      const customer = customerId
        ? await User.findById(customerId)
        : await User.findOne({ email: String(req.body.customerEmail).trim().toLowerCase() });
      if (customer && customer.role === 'customer') {
        finalCustomerId = customer._id;
      } else if (customerId || !isPointOfSale) {
        return res.status(400).json({ ok: false, message: 'El cliente indicado no existe.' });
      }
      // customerEmail sin cuenta en una venta de mostrador: venta anónima
    } else if (!isPointOfSale) {
      return res.status(400).json({ ok: false, message: 'Falta proporcionar el customerId del cliente.' });
    }

    // 2. Pastelería destino (bakery/employee: siempre la suya)
    const finalBakeryId = (req.user.role === 'bakery' || req.user.role === 'employee') ? req.user.bakeryId : bakeryId;
    const targetBakery = finalBakeryId ? await Bakery.findOne({ _id: finalBakeryId, status: 'active' }) : null;
    if (!targetBakery) {
      return res.status(400).json({ ok: false, message: 'Pastelería no válida o inactiva.' });
    }

    // Límite mensual de pedidos del plan (el gratuito lo define la configuración de la plataforma)
    // (una suscripción vencida o cancelada cuenta como plan gratuito)
    const planKey = await resolvePlanKey(targetBakery);
    const plan = await Plan.findOne({ key: planKey });
    const limit = planKey === 'basic' ? (await getSettings()).maxFreeOrders : plan?.maxOrdersPerMonth;
    if (limit !== null && limit !== undefined) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const used = await Order.countDocuments({
        bakeryId: finalBakeryId, createdAt: { $gte: monthStart }, status: { $nin: ['cancelled', 'rejected', 'declined'] }
      });
      if (used >= limit) {
        return res.status(400).json({ ok: false, message: 'La pastelería alcanzó el límite de pedidos de su plan este mes.' });
      }
    }
    if (type === 'custom' && !isStaff && targetBakery.allowsCustomCakes === false) {
      return res.status(400).json({ ok: false, message: 'Esta pastelería no acepta pedidos especiales.' });
    }
    if (!deliveryDate || Number.isNaN(new Date(deliveryDate).getTime())) {
      return res.status(400).json({ ok: false, message: 'La fecha de entrega es obligatoria.' });
    }
    if (!isStaff) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(deliveryDate) < today) {
        return res.status(400).json({ ok: false, message: 'La fecha de entrega no puede estar en el pasado.' });
      }
      if (type === 'custom') {
        const c = customDetails || {};
        const theme = String(c.theme || '').trim();
        if (theme && (theme.length < 3 || theme.length > 40 || !/^[\p{L} ,.'\-]+$/u.test(theme))) {
          return res.status(400).json({ ok: false, message: 'La temática solo puede llevar letras (sin números).' });
        }
        if (c.persons !== undefined && c.persons !== '' && !(Number.isInteger(Number(c.persons)) && Number(c.persons) >= 1 && Number(c.persons) <= 500)) {
          return res.status(400).json({ ok: false, message: 'Las personas deben ser un número entero entre 1 y 500.' });
        }
        if (c.budget !== undefined && c.budget !== '' && !(Number(c.budget) > 0 && Number(c.budget) <= 1000000)) {
          return res.status(400).json({ ok: false, message: 'El presupuesto debe ser un monto mayor a 0.' });
        }
        if (String(c.message || '').length > 60) return res.status(400).json({ ok: false, message: 'El mensaje del pastel no puede superar 60 caracteres.' });
        if (String(c.specialInstructions || '').length > 300) return res.status(400).json({ ok: false, message: 'Las notas no pueden superar 300 caracteres.' });
      }
    }
    const deliveryAddress = String(req.body.deliveryAddress || '').trim().slice(0, 300);
    if (!isStaff && deliveryMethod === 'delivery' && !deliveryAddress) {
      return res.status(400).json({ ok: false, message: 'Indica la dirección de entrega.' });
    }

    // Pago con tarjeta guardada del cliente (solo se conservan los últimos 4 dígitos)
    let cardLast4 = '';
    if (req.user.role === 'customer' && paymentMethod === 'card') {
      const owner = await User.findById(req.user.id);
      const card = owner.savedCards.id(req.body.cardId);
      if (!card) return res.status(400).json({ ok: false, message: 'Elige una de tus tarjetas guardadas para pagar con tarjeta.' });
      cardLast4 = card.last4;
    }

    // 3. Items y total: se toman SIEMPRE de la base de datos, no del cliente
    let orderItems = [];
    let totalPrice = 0;
    if (type === 'standard') {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ ok: false, message: 'El pedido debe incluir al menos un producto.' });
      }
      for (const item of items) {
        const quantity = Math.max(Math.floor(Number(item.quantity)) || 1, 1);
        const product = await Product.findById(item.productId);
        if (!product || String(product.bakeryId) !== String(finalBakeryId) || !product.isAvailable) {
          return res.status(400).json({ ok: false, message: `El producto "${item.name || item.productId}" no está disponible en esta pastelería.` });
        }
        if (product.stock < quantity) {
          return res.status(400).json({
            ok: false,
            message: `No hay suficiente stock de "${product.name}". Disponible: ${product.stock}`
          });
        }
        // Talla: si el producto tiene tallas, el cliente debe elegir una válida
        const size = String(item.size || '');
        if (!isPointOfSale && product.sizes?.length && !product.sizes.includes(size)) {
          return res.status(400).json({ ok: false, message: `Elige una talla válida para "${product.name}".` });
        }
        orderItems.push({ productId: product._id, name: product.name, quantity, price: product.price, size });
        totalPrice += product.price * quantity;
      }
    } else if (isPointOfSale) {
      // Venta personalizada en local: el personal fija el precio
      totalPrice = Math.max(Number(req.body.totalPrice) || 0, 0);
    }
    // Pedido personalizado en línea: precio 0 hasta que la pastelería cotice

    // 4. Estado inicial
    let status = 'pending';
    const details = type === 'custom' ? pick(customDetails, CUSTOM_DETAIL_FIELDS) : undefined;
    if (type === 'custom') {
      status = isPointOfSale ? 'in_preparation' : 'pending_quote';
      // Un cliente no puede autoaprobarse ni ponerse precio
      if (!isStaff) { delete details.isApproved; delete details.quotedPrice; }
      if (isPointOfSale) details.isApproved = true;
    } else if (isPointOfSale) {
      status = deliveryMethod === 'delivery' ? 'in_preparation' : 'delivered';
    }

    const platformCommission = await commissionOf(totalPrice);

    // Descuento atómico de stock (mostrador y pedidos en línea); si no alcanza, no se crea nada
    if (type === 'standard') {
      const result = await deductStock(orderItems.map((i) => ({ productId: i.productId, quantity: i.quantity, name: i.name })));
      if (!result.ok) {
        return res.status(400).json({ ok: false, message: `No hay suficiente stock de "${result.name}". Disponible: ${result.stock}` });
      }
    }

    let order;
    try {
      order = await Order.create({
        customerId: finalCustomerId,
        bakeryId: finalBakeryId,
        assignedEmployeeId: req.user.role === 'employee' ? req.user.id : null,
        orderType: type,
        items: orderItems,
        customDetails: details,
        status,
        deliveryDate,
        isPointOfSale,
        paymentMethod,
        cardLast4,
        deliveryAddress,
        deliveryMethod: deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
        totalPrice,
        platformCommission,
        stockDeducted: type === 'standard'
      });
    } catch (err) {
      if (type === 'standard') await restoreStock(orderItems);
      throw err;
    }

    if (type === 'custom' && !isStaff) {
      const bakery = await Bakery.findById(finalBakeryId);
      if (bakery) {
        await Notification.create({
          userId: bakery.ownerId, orderId: order._id, type: 'order',
          title: 'Nueva solicitud personalizada',
          message: `${req.user.name} envió una solicitud de pastel personalizado para el ${new Date(deliveryDate).toLocaleDateString()}.`
        });
      }
    }

    // 6. Ingreso financiero automático si se cobró y entregó en el local
    if (isPointOfSale && status === 'delivered' && totalPrice > 0) {
      await Finance.create({
        bakeryId: finalBakeryId,
        orderId: order._id,
        type: 'income',
        concept: `Venta de mostrador #${order._id.toString().slice(-6)}`,
        category: 'Venta',
        amount: totalPrice,
        commissionAmount: platformCommission
      });
    }

    res.status(201).json({ ok: true, message: 'Pedido registrado exitosamente', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear el pedido', error: error.message });
  }
};

// Pastelería / Empleado / Admin: cambiar estado, asignar empleado o cotizar un pedido personalizado
exports.updateOrder = async (req, res) => {
  try {
    const { status, assignedEmployeeId, customDetails, totalPrice } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return notFound(res, 'Pedido no encontrado');
    if (!canAccessBakery(req.user, order.bakeryId)) return forbidden(res);

    const canPrice = req.user.role !== 'employee';
    const previousStatus = order.status;

    if (status !== undefined && RELEASE_STATUSES.includes(previousStatus) && status !== previousStatus) {
      return res.status(400).json({ ok: false, message: 'Un pedido cancelado o rechazado no se puede reabrir; crea uno nuevo.' });
    }
    if (status !== undefined && QUOTE_FLOW.includes(previousStatus) && status !== previousStatus && status !== 'cancelled') {
      return res.status(400).json({ ok: false, message: 'Este pedido está en proceso de cotización: usa las acciones de cotizar, aceptar o rechazar.' });
    }
    if (status !== undefined && order.orderType === 'custom' && QUOTE_FLOW.includes(status) && status !== previousStatus) {
      return res.status(400).json({ ok: false, message: 'Los estados de cotización solo se cambian con las acciones de cotizar, aceptar o rechazar.' });
    }

    // El empleado solo marca el pedido como "preparado"; la pastelería lo valida y lo libera como "listo"
    if (req.user.role === 'employee' && status !== undefined && status !== previousStatus && ['ready', 'delivered'].includes(status)) {
      return forbidden(res, 'Solo la pastelería puede validar un pedido como listo o entregado.');
    }
    if (req.user.role === 'employee' && previousStatus === 'ready' && status !== undefined && status !== previousStatus) {
      return forbidden(res, 'Este pedido ya fue validado por la pastelería.');
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ ok: false, message: 'Estado de pedido inválido.' });
      order.status = status;
    }

    let newlyAssigned = null;
    if (assignedEmployeeId !== undefined) {
      if (req.user.role === 'employee') return forbidden(res, 'Solo la pastelería puede asignar empleados.');
      if (assignedEmployeeId === null) {
        order.assignedEmployeeId = null; // desasignar
      } else {
        const employee = await User.findById(assignedEmployeeId);
        if (!employee || employee.role !== 'employee' || String(employee.bakeryId) !== String(order.bakeryId)) {
          return res.status(400).json({ ok: false, message: 'El empleado no pertenece a esta pastelería.' });
        }
        if (String(order.assignedEmployeeId) !== String(employee._id)) newlyAssigned = employee._id;
        order.assignedEmployeeId = employee._id;
      }
    }

    if (customDetails && canPrice) {
      order.customDetails = { ...order.customDetails.toObject(), ...pick(customDetails, CUSTOM_DETAIL_FIELDS) };
    }
    if (totalPrice !== undefined && canPrice) {
      const price = Number(totalPrice);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ ok: false, message: 'Precio inválido.' });
      order.totalPrice = price;
      order.platformCommission = await commissionOf(price);
    }

    // Si el pedido se cierra sin venderse, el stock reservado vuelve al inventario
    const releasesStock = order.stockDeducted && status !== undefined && status !== previousStatus && RELEASE_STATUSES.includes(status);
    if (releasesStock) order.stockDeducted = false;
    await order.save();
    if (releasesStock) await restoreStock(order.items);

    if (newlyAssigned) {
      await Notification.create({
        userId: newlyAssigned,
        orderId: order._id,
        type: 'order',
        title: 'Nuevo pedido asignado',
        message: `Se te ha asignado un pedido para entrega el ${new Date(order.deliveryDate).toLocaleDateString()}.`
      });
    }

    // Notificar al cliente solo si el estado realmente cambió
    if (status && status !== previousStatus) {
      const statusText = {
        pending_quote: 'Cotización en revisión',
        pending: 'Cotización aprobada y pendiente de preparación',
        in_preparation: 'En preparación 🎂',
        ready: '¡Listo para recoger/entregar! 🎉',
        delivered: 'Entregado',
        cancelled: 'Cancelado'
      };
      // "prepared" es un paso interno: avisa a la pastelería para revisar, no al cliente
      if (status === 'prepared') {
        const bakery = await Bakery.findById(order.bakeryId).select('ownerId');
        if (bakery?.ownerId) {
          await Notification.create({
            userId: bakery.ownerId,
            orderId: order._id,
            type: 'order',
            title: 'Pedido por revisar',
            message: `El pedido #${order._id.toString().slice(-6).toUpperCase()} fue marcado como preparado y espera tu validación.`
          });
        }
      } else if (order.customerId) {
        await Notification.create({
          userId: order.customerId,
          orderId: order._id,
          type: 'order',
          title: 'Actualización de tu pedido',
          message: `El estado de tu pedido ahora es: ${statusText[status] || status}`
        });
      }

      // Si el pedido se cierra sin venderse, su ingreso (si ya se había registrado) se retira de las finanzas
      if (RELEASE_STATUSES.includes(status)) await Finance.deleteMany({ orderId: order._id, type: 'income' });

      // Solo al entregarse (cobrarse) cuenta como ganancia: se registra una sola vez por pedido
      if (status === 'delivered' && order.totalPrice > 0 && !(await Finance.exists({ orderId: order._id, type: 'income' }))) {
        await Finance.create({
          bakeryId: order.bakeryId,
          orderId: order._id,
          type: 'income',
          concept: `Venta de pedido #${order._id.toString().slice(-6)}`,
          category: 'Venta',
          amount: order.totalPrice,
          commissionAmount: order.platformCommission
        });
      }
    }

    res.json({ ok: true, message: 'Pedido actualizado correctamente', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar pedido', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return notFound(res, 'Pedido no encontrado');
    if (!canAccessBakery(req.user, order.bakeryId)) return forbidden(res);

    // Un pedido con stock reservado lo devuelve al inventario; los entregados ya se vendieron
    if (order.stockDeducted && order.status !== 'delivered') await restoreStock(order.items);
    await removeOrderRefs([order._id]);
    await order.deleteOne();
    res.json({ ok: true, message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar pedido' });
  }
};

// ---- Ciclo de cotización de pedidos personalizados -------------------------------------------

const notify = (userId, order, title, message) =>
  userId ? Notification.create({ userId, orderId: order._id, type: 'order', title, message }) : null;

// Pastelería: cotiza una solicitud personalizada (pending_quote/awaiting_client -> awaiting_client)
exports.quoteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return notFound(res, 'Pedido no encontrado');
    if (!canAccessBakery(req.user, order.bakeryId)) return forbidden(res);
    if (order.orderType !== 'custom' || !['pending_quote', 'awaiting_client'].includes(order.status)) {
      return res.status(400).json({ ok: false, message: 'Solo se pueden cotizar solicitudes personalizadas pendientes.' });
    }
    const price = Number(req.body.quotedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ ok: false, message: 'El precio cotizado debe ser mayor a 0.' });
    }

    order.customDetails.quotedPrice = price;
    order.customDetails.isApproved = false;
    order.totalPrice = price;
    order.platformCommission = await commissionOf(price);
    order.status = 'awaiting_client';
    await order.save();

    await notify(order.customerId, order, 'Cotización recibida', `La pastelería cotizó tu pedido personalizado en $${price}. Revísala y confirma.`);
    res.json({ ok: true, message: 'Cotización enviada', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al cotizar el pedido' });
  }
};

// Pastelería: rechaza una solicitud personalizada, con motivo opcional
exports.rejectOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return notFound(res, 'Pedido no encontrado');
    if (!canAccessBakery(req.user, order.bakeryId)) return forbidden(res);
    if (order.orderType !== 'custom' || !['pending_quote', 'awaiting_client'].includes(order.status)) {
      return res.status(400).json({ ok: false, message: 'Solo se pueden rechazar solicitudes personalizadas pendientes.' });
    }
    order.status = 'rejected';
    order.customDetails.bakeryNote = String(req.body.note || '').slice(0, 500);
    await order.save();

    await notify(order.customerId, order, 'Solicitud rechazada', order.customDetails.bakeryNote
      ? `La pastelería no puede realizar tu pedido: ${order.customDetails.bakeryNote}`
      : 'La pastelería no puede realizar tu pedido personalizado.');
    res.json({ ok: true, message: 'Solicitud rechazada', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al rechazar la solicitud' });
  }
};

// Cliente: cancela SU pedido mientras la pastelería aún no empieza a prepararlo
const CUSTOMER_CANCELLABLE = ['pending_quote', 'awaiting_client', 'pending'];
exports.cancelOwnOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || String(order.customerId) !== String(req.user.id)) return notFound(res, 'Pedido no encontrado');
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      return res.status(400).json({
        ok: false,
        message: RELEASE_STATUSES.includes(order.status)
          ? 'Este pedido ya está cancelado.'
          : 'La pastelería ya empezó a preparar tu pedido; contáctala para cancelarlo.'
      });
    }
    const releasesStock = order.stockDeducted;
    order.status = 'cancelled';
    order.stockDeducted = false;
    await order.save();
    if (releasesStock) await restoreStock(order.items);

    const bakery = await Bakery.findById(order.bakeryId);
    if (bakery) {
      await notify(bakery.ownerId, order, 'Pedido cancelado por el cliente', `${req.user.name} canceló el pedido #${String(order._id).slice(-6).toUpperCase()}.`);
    }
    res.json({ ok: true, message: 'Pedido cancelado', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al cancelar el pedido' });
  }
};

// Cliente: acepta (paga) o rechaza la cotización de SU pedido (awaiting_client -> pending | declined)
exports.respondToQuote = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return notFound(res, 'Pedido no encontrado');
    if (String(order.customerId) !== String(req.user.id)) return forbidden(res);
    if (order.orderType !== 'custom' || order.status !== 'awaiting_client') {
      return res.status(400).json({ ok: false, message: 'Este pedido no tiene una cotización pendiente de respuesta.' });
    }
    if (typeof req.body.accept !== 'boolean') {
      return res.status(400).json({ ok: false, message: 'Indica si aceptas la cotización (accept: true/false).' });
    }

    const accept = req.body.accept;
    if (accept) {
      order.status = 'pending'; // confirmado: la pastelería ya puede aceptarlo y prepararlo
      order.customDetails.isApproved = true;
      order.paymentMethod = 'card';
    } else {
      order.status = 'declined';
    }
    await order.save();

    const bakery = await Bakery.findById(order.bakeryId);
    if (bakery) {
      await notify(bakery.ownerId, order, accept ? 'Cotización aceptada' : 'Cotización rechazada por el cliente',
        accept ? `${req.user.name} aceptó la cotización de $${order.totalPrice}.` : `${req.user.name} rechazó la cotización.`);
    }
    res.json({ ok: true, message: accept ? 'Cotización aceptada' : 'Cotización rechazada', order });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al responder la cotización' });
  }
};
