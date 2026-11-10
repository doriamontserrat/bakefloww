// Adaptador para correr el backend como función serverless en Vercel.
// En lugar de app.listen(), exporta un handler que conecta a MongoDB (con caché entre invocaciones).
const mongoose = require('mongoose');
const app = require('./app');

let ready = null;

function init() {
  if (!ready) {
    ready = (async () => {
      for (const name of ['MONGO_URI', 'JWT_SECRET']) {
        if (!process.env[name]) throw new Error(`Falta la variable de entorno ${name} en Vercel`);
      }
      await mongoose.connect(process.env.MONGO_URI);
      await require('./models/Plan.model').ensureDefaults();
      require('./models/Category.model').syncIndexes().catch((e) => console.error('syncIndexes Category:', e.message));
    })().catch((err) => {
      ready = null; // permitir reintento en la siguiente petición
      throw err;
    });
  }
  return ready;
}

module.exports = async (req, res) => {
  // /api/health no necesita base de datos
  if (req.url.startsWith('/api/health')) return app(req, res);
  try {
    await init();
  } catch (err) {
    console.error('Error al iniciar el backend:', err.message);
    return res.status(500).json({ ok: false, message: 'No se pudo conectar con la base de datos.' });
  }
  return app(req, res);
};
