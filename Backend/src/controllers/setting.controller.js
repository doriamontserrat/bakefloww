const Setting = require('../models/Setting.model');
const { pick } = require('../utils/access');
const { getSettings, invalidateSettings } = require('../utils/settings');

const FIELDS = ['siteName', 'supportEmail', 'commissionRate', 'maxFreeOrders', 'maintenanceMode', 'emailNotifications', 'autoRenew', 'welcomeBonus'];

// Datos que cualquiera puede ver (nombre del sitio, soporte y si está en mantenimiento)
exports.getPublicSettings = async (req, res) => {
  try {
    const s = await getSettings();
    res.json({ ok: true, settings: { siteName: s.siteName, supportEmail: s.supportEmail, maintenanceMode: s.maintenanceMode, commissionRate: s.commissionRate, maxFreeOrders: s.maxFreeOrders } });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener la configuración' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    res.json({ ok: true, settings: await Setting.getSingleton() });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error al obtener la configuración' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    settings.set(pick(req.body, FIELDS));
    await settings.save();
    invalidateSettings();
    res.json({ ok: true, message: 'Configuración guardada', settings });
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Error al guardar la configuración', error: error.message });
  }
};