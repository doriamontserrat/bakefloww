const Setting = require('../models/Setting.model');

// Cache corto para no consultar la configuración en cada petición
let cache = null;
let cachedAt = 0;
const TTL_MS = 10_000;

exports.getSettings = async () => {
  if (!cache || Date.now() - cachedAt > TTL_MS) {
    cache = (await Setting.getSingleton()).toObject();
    cachedAt = Date.now();
  }
  return cache;
};

exports.invalidateSettings = () => { cache = null; };

// Comisión de la plataforma como fracción (8 => 0.08)
exports.getCommissionRate = async () => (await exports.getSettings()).commissionRate / 100;