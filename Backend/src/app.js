const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Detrás del proxy de Render/Railway: necesario para que el rate-limit lea la IP real del cliente
app.set('trust proxy', 1);

// 1. Cabeceras de seguridad HTTP
// crossOriginResourcePolicy abierto: el frontend (otro origen) debe poder mostrar las imágenes subidas
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 2. Configurar CORS (permite peticiones desde tu Vite local y tu GitHub Pages)
// FRONTEND_URL admite varios orígenes separados por coma (sin "/" final)
const allowedOrigins = [
  'http://localhost:5173',
  'https://fatimasalazarr.github.io',
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));

// 3. Lectura de JSON con límite de peso seguro
app.use(express.json({ limit: '10mb' }));

// 4. Límite de peticiones contra ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 1000, // uso normal de la app (varias llamadas por pantalla)
  message: { ok: false, message: 'Demasiadas peticiones desde esta IP, intenta de nuevo en unos minutos.' }
});
app.use('/api', limiter);

// Límite estricto solo para login/registro (fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { ok: false, message: 'Demasiados intentos de acceso, intenta de nuevo en 15 minutos.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/users/authorize-supervisor', authLimiter);
app.use('/api/users/verify-credentials', authLimiter);

// Ruta de verificación de salud del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'API de BakeFlow funcionando correctamente 🧁' });
});

// Conectar todas las rutas de la API de BakeFlow
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/bakeries', require('./routes/bakery.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/finances', require('./routes/finance.routes'));
app.use('/api/incidents', require('./routes/incident.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/plans', require('./routes/plan.routes'));
app.use('/api/settings', require('./routes/setting.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
const { router: uploadRouter, UPLOAD_DIR } = require('./routes/upload.routes');
app.use('/api/uploads', uploadRouter);
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

module.exports = app;