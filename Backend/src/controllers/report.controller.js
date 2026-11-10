const Order = require('../models/Order.model');
const Finance = require('../models/Finance.model');

const DEAD = ['cancelled', 'rejected', 'declined'];
const SOLD = ['ready', 'delivered']; // cuentan como ganancia
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const round = (n) => Math.round(n * 100) / 100;

// Pastelería sobre la que se reporta: la propia, o la indicada por query si es admin
function scope(req) {
  const bakeryId = req.user.role === 'admin' ? req.query.bakeryId : req.user.bakeryId;
  return bakeryId ? { bakeryId } : null;
}

const loadOrders = (filter) => Order.find(filter).populate('customerId', 'name').lean();

// Reportes básicos: disponibles en todos los planes (mes en curso)
exports.summary = async (req, res) => {
  try {
    const filter = scope(req);
    if (!filter) return res.json({ ok: true, summary: { monthOrders: 0, monthSales: 0, byStatus: {}, pending: 0 } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const orders = await loadOrders({ ...filter, createdAt: { $gte: monthStart } });
    const byStatus = {};
    for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const live = orders.filter((o) => !DEAD.includes(o.status));
    res.json({
      ok: true,
      summary: {
        monthOrders: live.length,
        monthSales: round(orders.filter((o) => SOLD.includes(o.status)).reduce((s, o) => s + o.totalPrice, 0)),
        pending: orders.filter((o) => ['pending', 'pending_quote', 'awaiting_client'].includes(o.status)).length,
        byStatus
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al generar el reporte' });
  }
};

// Reporte de ventas (Pro): últimos 6 meses, productos más vendidos y métodos de pago
exports.sales = async (req, res) => {
  try {
    const filter = scope(req);
    if (!filter) return res.json({ ok: true, months: [], topProducts: [], payments: [] });
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = (await loadOrders({ ...filter, createdAt: { $gte: from } })).filter((o) => SOLD.includes(o.status));

    const months = [];
    for (let i = 5; i >= 0; i--) months.push({ key: monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), orders: 0, sales: 0 });
    const monthByKey = Object.fromEntries(months.map((m) => [m.key, m]));
    const products = {};
    const payments = {};
    for (const o of orders) {
      const m = monthByKey[monthKey(new Date(o.createdAt))];
      if (m) { m.orders += 1; m.sales = round(m.sales + o.totalPrice); }
      for (const it of o.items || []) {
        const p = (products[it.name] ||= { name: it.name, units: 0, revenue: 0 });
        p.units += it.quantity;
        p.revenue = round(p.revenue + it.price * it.quantity);
      }
      const pay = (payments[o.paymentMethod] ||= { method: o.paymentMethod, orders: 0, total: 0 });
      pay.orders += 1;
      pay.total = round(pay.total + o.totalPrice);
    }
    res.json({
      ok: true,
      months,
      topProducts: Object.values(products).sort((a, b) => b.units - a.units).slice(0, 8),
      payments: Object.values(payments).sort((a, b) => b.total - a.total)
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al generar el reporte' });
  }
};

// Reporte avanzado (Premium): clientes top, ticket promedio, cancelaciones y comisiones
exports.advanced = async (req, res) => {
  try {
    const filter = scope(req);
    if (!filter) return res.json({ ok: true, kpis: {}, topCustomers: [], byWeekday: [], byType: [] });
    const orders = await loadOrders(filter);
    const sold = orders.filter((o) => SOLD.includes(o.status));
    const revenue = sold.reduce((s, o) => s + o.totalPrice, 0);

    const customers = {};
    for (const o of sold) {
      if (!o.customerId) continue;
      const c = (customers[String(o.customerId._id)] ||= { name: o.customerId.name, orders: 0, total: 0 });
      c.orders += 1;
      c.total = round(c.total + o.totalPrice);
    }
    const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const byWeekday = DAYS.map((day) => ({ day, orders: 0 }));
    for (const o of orders.filter((x) => !DEAD.includes(x.status))) byWeekday[new Date(o.deliveryDate).getDay()].orders += 1;
    const byType = ['standard', 'custom'].map((type) => {
      const list = sold.filter((o) => o.orderType === type);
      return { type, orders: list.length, total: round(list.reduce((s, o) => s + o.totalPrice, 0)) };
    });

    res.json({
      ok: true,
      kpis: {
        totalOrders: orders.length,
        soldOrders: sold.length,
        revenue: round(revenue),
        averageTicket: sold.length ? round(revenue / sold.length) : 0,
        cancellationRate: orders.length ? round((orders.filter((o) => DEAD.includes(o.status)).length / orders.length) * 100) : 0,
        platformCommission: round(sold.reduce((s, o) => s + (o.platformCommission || 0), 0)),
        netRevenue: round(revenue - sold.reduce((s, o) => s + (o.platformCommission || 0), 0))
      },
      topCustomers: Object.values(customers).sort((a, b) => b.total - a.total).slice(0, 5),
      byWeekday,
      byType
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al generar el reporte' });
  }
};

// ---- Exportación (Pro) ----------------------------------------------------------------------

// Escapa una celda CSV y neutraliza fórmulas (=, +, -, @) para que Excel no las ejecute
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, rows) => '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
const dateOf = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

// GET /reports/export?type=finances|transactions  -> JSON con filas (el frontend arma CSV o PDF)
// GET /reports/export?type=...&format=csv         -> archivo CSV
exports.exportData = async (req, res) => {
  try {
    const type = req.query.type;
    if (!['finances', 'transactions'].includes(type)) {
      return res.status(400).json({ ok: false, message: 'Tipo de reporte inválido (finances o transactions).' });
    }
    const filter = scope(req);
    if (!filter) return res.status(400).json({ ok: false, message: 'No hay pastelería asociada.' });

    const range = {};
    if (req.query.from && !Number.isNaN(new Date(req.query.from).getTime())) range.$gte = new Date(req.query.from);
    if (req.query.to && !Number.isNaN(new Date(req.query.to).getTime())) range.$lte = new Date(new Date(req.query.to).setHours(23, 59, 59, 999));

    let header, rows, title;
    if (type === 'finances') {
      title = 'Reporte de finanzas';
      const records = await Finance.find({ ...filter, ...(range.$gte || range.$lte ? { date: range } : {}) }).sort({ date: -1 }).lean();
      header = ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto', 'Comisión plataforma'];
      rows = records.map((r) => [dateOf(r.date), r.type === 'income' ? 'Ingreso' : 'Gasto', r.category, r.concept, r.amount, r.commissionAmount || 0]);
    } else {
      title = 'Reporte de transacciones';
      const orders = await loadOrders({ ...filter, ...(range.$gte || range.$lte ? { createdAt: range } : {}) });
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      header = ['Fecha', 'Pedido', 'Cliente', 'Tipo', 'Estado', 'Método de pago', 'Total', 'Comisión plataforma'];
      rows = orders.map((o) => [
        dateOf(o.createdAt), String(o._id).slice(-6).toUpperCase(), o.customerId?.name || 'Mostrador',
        o.orderType === 'custom' ? 'Personalizado' : 'Estándar', o.status, o.paymentMethod, o.totalPrice, o.platformCommission || 0
      ]);
    }

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${dateOf(new Date())}.csv"`);
      return res.send(toCsv(header, rows));
    }
    res.json({ ok: true, title, header, rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al exportar el reporte' });
  }
};
