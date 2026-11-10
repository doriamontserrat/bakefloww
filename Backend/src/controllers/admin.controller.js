const User = require('../models/User.model');
const Bakery = require('../models/Bakery.model');
const Order = require('../models/Order.model');
const Finance = require('../models/Finance.model');
const Incident = require('../models/Incident.model');
const Payment = require('../models/Payment.model');
const Plan = require('../models/Plan.model');

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PLAN_LABEL = { basic: 'Gratuito', pro: 'Pro', enterprise: 'Premium' };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

// Últimos n meses (incluye el actual) como [{ year, month, label, start, end }]
function lastMonths(n, ref = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()], start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  });
}
const sum = (rows, field) => rows.reduce((s, r) => s + (r[field] || 0), 0);
const inRange = (date, m) => new Date(date) >= m.start && new Date(date) < m.end;

// Ingresos de la plataforma = comisiones cobradas (Finance) + suscripciones cobradas (Payment)
async function platformIncome() {
  const [commissions, payments] = await Promise.all([
    Finance.find({ type: 'income', commissionAmount: { $gt: 0 } }).select('commissionAmount date'),
    Payment.find().select('amount createdAt')
  ]);
  return [
    ...commissions.map((c) => ({ amount: c.commissionAmount, date: c.date })),
    ...payments.map((p) => ({ amount: p.amount, date: p.createdAt }))
  ];
}

// Panel de inicio del admin
exports.getOverview = async (req, res) => {
  try {
    const now = new Date();
    const months = lastMonths(6, now);
    const thisMonth = startOfMonth(now);
    const weekAgo = new Date(now.getTime() - 7 * 864e5);

    const [bakeries, users, incidents, income] = await Promise.all([
      Bakery.find().populate('ownerId', 'name').sort({ createdAt: -1 }),
      User.find().select('role createdAt'),
      Incident.find().select('status createdAt'),
      platformIncome()
    ]);

    const activeSubs = bakeries.filter((b) => b.subscription?.status === 'active');
    const paidSubs = activeSubs.filter((b) => b.subscription.plan !== 'basic' && b.subscription.expiresAt && new Date(b.subscription.expiresAt) > now);
    const mrr = sum(paidSubs.map((b) => ({ price: b.subscription.price })), 'price');
    const monthRevenue = sum(income.filter((i) => new Date(i.date) >= thisMonth), 'amount');
    const prevMonth = months[months.length - 2];
    const prevRevenue = prevMonth ? sum(income.filter((i) => inRange(i.date, prevMonth)), 'amount') : 0;
    const incidentsMonth = incidents.filter((i) => i.createdAt >= thisMonth);

    res.json({
      ok: true,
      totals: {
        bakeries: bakeries.length,
        newBakeriesThisMonth: bakeries.filter((b) => b.createdAt >= thisMonth).length,
        users: users.length,
        newUsersThisWeek: users.filter((u) => u.createdAt >= weekAgo).length,
        activeSubscriptions: activeSubs.length,
        paidSubscriptions: paidSubs.length,
        mrr,
        monthRevenue,
        revenueChangePct: prevRevenue > 0 ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null,
        incidentsThisMonth: incidentsMonth.length,
        incidentsResolvedThisMonth: incidentsMonth.filter((i) => i.status === 'resolved').length
      },
      revenueByMonth: months.map((m) => ({ month: m.label, value: sum(income.filter((i) => inRange(i.date, m)), 'amount') })),
      bakeryGrowth: months.map((m) => ({ month: m.label, value: bakeries.filter((b) => b.createdAt < m.end).length })),
      subscriptionsByPlan: ['enterprise', 'pro', 'basic'].map((key) => ({
        plan: key, label: PLAN_LABEL[key], count: activeSubs.filter((b) => b.subscription.plan === key).length
      })),
      recentBakeries: bakeries.slice(0, 5).map((b) => ({
        id: b._id, name: b.name, plan: PLAN_LABEL[b.subscription?.plan] || 'Gratuito', status: b.status, location: b.address, createdAt: b.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener el resumen' });
  }
};

// Estadísticas por año: GET /admin/stats?year=2026
exports.getStats = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const [bakeries, orders, income, firstOrder] = await Promise.all([
      Bakery.find().select('createdAt subscription'),
      Order.find({ status: { $nin: ['cancelled', 'rejected', 'declined'] } }).select('totalPrice createdAt'),
      platformIncome(),
      Order.findOne().sort({ createdAt: 1 }).select('createdAt')
    ]);

    const months = Array.from({ length: 12 }, (_, m) => ({
      year, month: m, label: MONTHS[m], start: new Date(year, m, 1), end: new Date(year, m + 1, 1)
    }));
    const now = new Date();
    const series = months
      .filter((m) => m.start <= now)
      .map((m) => ({
        month: m.label,
        revenue: sum(income.filter((i) => inRange(i.date, m)), 'amount'),
        orders: orders.filter((o) => inRange(o.createdAt, m)).length,
        bakeries: bakeries.filter((b) => b.createdAt < m.end).length
      }));

    const subs = bakeries.map((b) => b.subscription || {});
    const paid = subs.filter((s) => s.plan && s.plan !== 'basic');
    const everSubscribed = subs.filter((s) => s.status).length;
    const years = new Set([now.getFullYear(), year]);
    if (firstOrder) for (let y = firstOrder.createdAt.getFullYear(); y <= now.getFullYear(); y++) years.add(y);

    res.json({
      ok: true,
      year,
      years: [...years].sort(),
      series,
      kpis: {
        conversionPct: bakeries.length ? Math.round((paid.length / bakeries.length) * 100) : 0,   // gratuito -> pago
        retentionPct: everSubscribed ? Math.round((subs.filter((s) => s.status === 'active').length / everSubscribed) * 100) : 0,
        avgTicket: orders.length ? Math.round(sum(orders, 'totalPrice') / orders.length) : 0,
        totalOrders: orders.length
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener las estadísticas' });
  }
};

// Transacciones de la plataforma: suscripciones (Payment) + comisiones (Finance)
exports.getTransactions = async (req, res) => {
  try {
    const [payments, commissions] = await Promise.all([
      Payment.find().populate('bakeryId', 'name').sort({ createdAt: -1 }).limit(500),
      Finance.find({ type: 'income', commissionAmount: { $gt: 0 } }).populate('bakeryId', 'name').sort({ date: -1 }).limit(500)
    ]);
    const transactions = [
      ...payments.map((p) => ({
        id: 'SUB-' + String(p._id).slice(-6).toUpperCase(), bakery: p.bakeryId?.name || 'Pastelería eliminada',
        type: 'subscription', desc: p.concept, amount: p.amount, date: p.createdAt
      })),
      ...commissions.map((c) => ({
        id: 'COM-' + String(c._id).slice(-6).toUpperCase(), bakery: c.bakeryId?.name || 'Pastelería eliminada',
        type: 'commission', desc: `Comisión · Venta $${c.amount.toLocaleString()}`, amount: c.commissionAmount, date: c.date
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ ok: true, transactions });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener las transacciones' });
  }
};