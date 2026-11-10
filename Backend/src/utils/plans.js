const Bakery = require('../models/Bakery.model');

// Funciones que desbloquea cada plan. 'basic' es el plan gratuito.
//  finance        -> control financiero (ingresos y gastos)
//  stats          -> estadísticas y reportes de ventas
//  export         -> exportar CSV/PDF
//  advancedReports-> reportes avanzados
const PRO = ['finance', 'stats', 'export'];
const PLAN_FEATURES = {
  basic: [],
  pro: PRO,
  enterprise: [...PRO, 'advancedReports', 'automations']
};
const PLAN_NAMES = { basic: 'Gratuito', pro: 'Pro', enterprise: 'Premium' };
// Plan mínimo que desbloquea cada función (para el mensaje de "mejora tu plan")
const MIN_PLAN = { finance: 'pro', stats: 'pro', export: 'pro', advancedReports: 'enterprise', automations: 'enterprise' };

const hasFeature = (planKey, feature) => (PLAN_FEATURES[planKey] || []).includes(feature);

// ¿La suscripción de pago ya venció?
const isExpired = (sub) => !!sub && sub.plan !== 'basic' && sub.status === 'active' && !!sub.expiresAt && new Date(sub.expiresAt) <= new Date();

// Plan que realmente aplica hoy: una suscripción vencida, cancelada o inactiva vale como gratuito.
const effectivePlanKey = (bakery) => {
  const sub = bakery?.subscription;
  if (!sub || sub.plan === 'basic' || sub.status !== 'active' || isExpired(sub)) return 'basic';
  return sub.plan;
};

// Igual que effectivePlanKey, pero además deja guardado el vencimiento (status = 'expired').
async function resolvePlanKey(bakery) {
  if (bakery && isExpired(bakery.subscription)) {
    await Bakery.updateOne({ _id: bakery._id }, { $set: { 'subscription.status': 'expired' } });
    bakery.subscription.status = 'expired';
  }
  return effectivePlanKey(bakery);
}

// Marca como vencidas todas las suscripciones de pago cuya fecha ya pasó (tarea periódica).
const expireSubscriptions = () => Bakery.updateMany(
  { 'subscription.plan': { $ne: 'basic' }, 'subscription.status': 'active', 'subscription.expiresAt': { $lte: new Date() } },
  { $set: { 'subscription.status': 'expired' } }
);

// Corrige datos viejos: una pastelería en plan gratuito no cobra ni vence (había registros con precio $299 y fecha).
const normalizeFreeSubscriptions = () => Bakery.updateMany(
  { 'subscription.plan': 'basic', $or: [{ 'subscription.price': { $ne: 0 } }, { 'subscription.expiresAt': { $ne: null } }] },
  { $set: { 'subscription.price': 0, 'subscription.expiresAt': null } }
);

// Datos del plan que se envían al frontend al iniciar sesión.
async function planInfoFor(user) {
  if (!user.bakeryId || !['bakery', 'employee'].includes(user.role)) return null;
  const bakery = await Bakery.findById(user.bakeryId);
  if (!bakery) return null;
  const key = await resolvePlanKey(bakery);
  return { key, name: PLAN_NAMES[key], features: PLAN_FEATURES[key], expiresAt: key === 'basic' ? null : bakery.subscription.expiresAt, cancelAtPeriodEnd: key !== 'basic' && !!bakery.subscription.cancelAtPeriodEnd };
}

// Middleware: exige que el plan de la pastelería incluya la función. El admin siempre pasa.
const requireFeature = (feature) => async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();
    const bakery = req.user.bakeryId ? await Bakery.findById(req.user.bakeryId) : null;
    if (!bakery) return res.status(403).json({ ok: false, message: 'Tu cuenta no tiene una pastelería asociada.' });
    const key = await resolvePlanKey(bakery);
    if (!hasFeature(key, feature)) {
      return res.status(403).json({
        ok: false,
        code: 'PLAN_REQUIRED',
        feature,
        message: `Esta función requiere el plan ${PLAN_NAMES[MIN_PLAN[feature]] || 'superior'}. Mejora tu plan en "Mi plan".`
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al validar el plan' });
  }
};

module.exports = { PLAN_FEATURES, PLAN_NAMES, hasFeature, effectivePlanKey, resolvePlanKey, expireSubscriptions, normalizeFreeSubscriptions, planInfoFor, requireFeature };
