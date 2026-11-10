const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { verifyToken } = require('../middlewares/auth.middleware');
const Upload = require('../models/Upload.model');

const router = express.Router();
const publicRouter = express.Router();

// Las imágenes se guardan en MongoDB (persisten en Vercel, donde el disco es efímero).
// El contrato no cambia: POST /api/uploads devuelve { ok, url } y la imagen se sirve en /uploads/:filename.
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const TYPE = Object.fromEntries(Object.entries(EXT).map(([type, ext]) => [ext, type]));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.')))
});

// POST /api/uploads  (multipart, campo "file") => { ok, url }
router.post('/', verifyToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el máximo de 5 MB.' : err.message;
      return res.status(400).json({ ok: false, message });
    }
    if (!req.file) return res.status(400).json({ ok: false, message: 'No se recibió ninguna imagen.' });
    try {
      const filename = crypto.randomBytes(16).toString('hex') + EXT[req.file.mimetype];
      await Upload.create({ filename, contentType: req.file.mimetype, data: req.file.buffer, size: req.file.size });
      const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
      res.status(201).json({ ok: true, url: `${base}/uploads/${filename}` });
    } catch (e) {
      console.error('Error guardando imagen:', e.message);
      res.status(500).json({ ok: false, message: 'No se pudo guardar la imagen.' });
    }
  });
});

// GET /uploads/:filename  (público: se muestra en <img>)
publicRouter.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(filename)) return res.status(404).end();
    const doc = await Upload.findOne({ filename }).lean();
    if (!doc) return res.status(404).end();
    res.set({
      'Content-Type': doc.contentType || TYPE[filename.slice(-4)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(Buffer.from(doc.data.buffer ? doc.data.buffer : doc.data));
  } catch (e) {
    console.error('Error sirviendo imagen:', e.message);
    res.status(500).end();
  }
});

module.exports = { router, publicRouter };
