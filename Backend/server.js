require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 4000;

for (const name of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.error(`Falta la variable de entorno ${name} (revisa Backend/.env)`);
    process.exit(1);
  }
}

// Conectar a la base de datos y luego encender el servidor
connectDB().then(async () => {
  await require('./src/models/Plan.model').ensureDefaults();
  // Suscripciones vencidas: se marcan al arrancar y cada hora (además de validarse en cada petición)
  const { expireSubscriptions, normalizeFreeSubscriptions } = require('./src/utils/plans');
  normalizeFreeSubscriptions().catch((e) => console.error('Error al normalizar planes gratuitos:', e.message));
  const sweep = () => expireSubscriptions().catch((e) => console.error('Error al vencer suscripciones:', e.message));
  sweep();
  setInterval(sweep, 60 * 60 * 1000).unref();
  app.listen(PORT, () => {
    console.log(`Servidor de BakeFlow corriendo en http://localhost:${PORT}`);
  });
});