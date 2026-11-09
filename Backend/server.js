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
  app.listen(PORT, () => {
    console.log(`Servidor de BakeFlow corriendo en http://localhost:${PORT}`);
  });
});