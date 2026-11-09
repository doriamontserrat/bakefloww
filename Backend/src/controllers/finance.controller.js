const mongoose = require('mongoose');
const Finance = require('../models/Finance.model');
const { pick, canAccessBakery, forbidden, notFound } = require('../utils/access');

// Define a qué pastelería se limita la consulta: la propia (bakery) o la indicada por query (admin)
function scopeBakeryId(req) {
  if (req.user.role === 'admin') return req.query.bakeryId || null;
  return req.user.bakeryId;
}

exports.getFinances = async (req, res) => {
  try {
    const filter = {};
    const bakeryId = scopeBakeryId(req);
    if (req.user.role !== 'admin' && !bakeryId) {
      return res.json({ ok: true, summary: { totalIncome: 0, totalExpense: 0, totalCommissions: 0, netProfit: 0 }, records: [] });
    }
    if (bakeryId) filter.bakeryId = bakeryId;

    const records = await Finance.find(filter).populate('bakeryId', 'name').sort({ date: -1 });

    // Calcular resumen de ganancias y gastos
    const summary = records.reduce(
      (acc, item) => {
        if (item.type === 'income') {
          acc.totalIncome += item.amount;
          acc.totalCommissions += item.commissionAmount || 0;
        } else {
          acc.totalExpense += item.amount;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, totalCommissions: 0 }
    );
    summary.netProfit = summary.totalIncome - summary.totalExpense - summary.totalCommissions;

    res.json({ ok: true, summary, records });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener finanzas' });
  }
};

exports.createFinanceRecord = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const bakeryId = isAdmin ? req.body.bakeryId : req.user.bakeryId;
    if (!bakeryId) {
      return res.status(400).json({ ok: false, message: 'No hay pastelería asociada al movimiento.' });
    }
    // La comisión de plataforma solo la fija el sistema/admin, no la pastelería
    const fields = isAdmin
      ? ['type', 'concept', 'category', 'amount', 'commissionAmount', 'date', 'orderId']
      : ['type', 'concept', 'category', 'amount', 'date'];
    const record = await Finance.create({ ...pick(req.body, fields), bakeryId });
    res.status(201).json({ ok: true, message: 'Movimiento financiero registrado', record });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al registrar movimiento', error: error.message });
  }
};

exports.deleteFinanceRecord = async (req, res) => {
  try {
    const record = await Finance.findById(req.params.id);
    if (!record) return notFound(res, 'Registro no encontrado');
    if (!canAccessBakery(req.user, record.bakeryId)) return forbidden(res);

    await record.deleteOne();
    res.json({ ok: true, message: 'Registro financiero eliminado' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar registro' });
  }
};

// Obtener métricas agrupadas por mes y año para gráficas
exports.getFinanceMetrics = async (req, res) => {
  try {
    const filter = {};
    const bakeryId = scopeBakeryId(req);
    if (req.user.role !== 'admin' && !bakeryId) return res.json({ ok: true, metrics: [] });
    // aggregate() no castea strings a ObjectId, hay que hacerlo a mano
    if (bakeryId) filter.bakeryId = new mongoose.Types.ObjectId(String(bakeryId));

    const metrics = await Finance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' },
            type: '$type' // 'income' o 'expense'
          },
          totalAmount: { $sum: '$amount' },
          totalCommissions: { $sum: '$commissionAmount' },
          count: { $sum: 1 } // Número de transacciones
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.json({ ok: true, metrics });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al obtener métricas financieras' });
  }
};
