// Utilidades de autorización y saneamiento compartidas por los controladores.

// Copia solo las claves permitidas (evita mass assignment con req.body).
exports.pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ¿El usuario autenticado puede operar sobre un recurso de esta pastelería?
// Admin: siempre. Resto: solo si el recurso pertenece a su pastelería.
exports.canAccessBakery = (user, bakeryId) => {
  if (user.role === 'admin') return true;
  if (!user.bakeryId || !bakeryId) return false;
  return String(user.bakeryId) === String(bakeryId._id || bakeryId);
};

exports.forbidden = (res, message = 'No tienes permiso sobre este recurso.') =>
  res.status(403).json({ ok: false, message });

exports.notFound = (res, message = 'Recurso no encontrado') =>
  res.status(404).json({ ok: false, message });

// Id inválido de Mongo (CastError) => 400 en lugar de 500
exports.isCastError = (error) => error && error.name === 'CastError';

// Quita el hash de contraseña de un documento de usuario antes de responder
exports.publicUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};
