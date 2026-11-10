const mongoose = require('mongoose');
const dns = require('dns');

// Forzar DNS de Google para evitar el error querySrv ECONNREFUSED del proveedor de internet
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Conectado en: ${conn.connection.host}`);
    // Las categorías ahora son únicas por pastelería: elimina el índice único antiguo sobre 'name'
    require('../models/Category.model').syncIndexes().catch((e) => console.error('syncIndexes Category:', e.message));
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;