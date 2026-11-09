const Plan = require('../models/Plan.model');
const { pick, notFound } = require('../utils/access');

// Catálogo público de planes (lo usa la página de suscripción)
exports.getPlans = async (req, res) => {
  try {
    await Plan.ensureDefaults();
    const filter = req.user?.role === 'admin' ? {} : { isActive: true };
    const plans = await Plan.find(filter).sort({ price: 1 });
    res.json({ ok: true, plans });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener los planes' });
  }
};

// Admin: editar precio, nombre, beneficios o límite de pedidos de un plan
exports.updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findOneAndUpdate(
      { key: req.params.key },
      pick(req.body, ['name', 'price', 'features', 'maxOrdersPerMonth', 'isActive']),
      { new: true, runValidators: true }
    );
    if (!plan) return notFound(res, 'Plan no encontrado');
    res.json({ ok: true, message: 'Plan actualizado', plan });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar el plan', error: error.message });
  }
};