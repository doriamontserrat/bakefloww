const Incident = require('../models/Incident.model');
const { pick, canAccessBakery, forbidden, notFound } = require('../utils/access');

// Admin: todas. Resto: las que reportó + (pastelería) las dirigidas a su pastelería.
exports.getIncidents = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter = { $or: [{ reportedBy: req.user.id }] };
      if (req.user.role === 'bakery' && req.user.bakeryId) filter.$or.push({ bakeryId: req.user.bakeryId });
    }
    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'name email role')
      .populate('bakeryId', 'name')
      .sort({ createdAt: -1 });
    res.json({ ok: true, incidents });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener incidencias' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const data = pick(req.body, ['type', 'title', 'description', 'orderId', 'bakeryId']);
    // Pastelería/empleado reportan siempre desde su propia pastelería
    if (['bakery', 'employee'].includes(req.user.role)) data.bakeryId = req.user.bakeryId;
    const incident = await Incident.create({ ...data, reportedBy: req.user.id });
    res.status(201).json({ ok: true, message: 'Incidencia reportada', incident });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al crear incidencia', error: error.message });
  }
};

// Admin: gestiona estado y resolución. Pastelería: solo edita el texto de las que ella reportó.
exports.updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return notFound(res, 'Incidencia no encontrada');

    if (req.user.role === 'admin') {
      incident.set(pick(req.body, ['type', 'title', 'description', 'status', 'adminResolution']));
    } else {
      if (String(incident.reportedBy) !== String(req.user.id)) return forbidden(res);
      incident.set(pick(req.body, ['title', 'description']));
    }
    await incident.save();
    res.json({ ok: true, message: 'Incidencia actualizada', incident });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al actualizar incidencia' });
  }
};

exports.deleteIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return notFound(res, 'Incidencia no encontrada');
    if (req.user.role !== 'admin' && String(incident.reportedBy) !== String(req.user.id)) return forbidden(res);

    await incident.deleteOne();
    res.json({ ok: true, message: 'Incidencia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al eliminar incidencia' });
  }
};
