const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Las imágenes se guardan en Backend/uploads. Para producción con disco efímero (Render, Railway...)
// basta con reemplazar este storage por S3/Cloudinary: el contrato (devolver { url }) no cambia.
// En Vercel el sistema de archivos es de solo lectura salvo /tmp (y es temporal).
const UPLOAD_DIR = process.env.VERCEL
  ? path.join(require('os').tmpdir(), 'uploads')
  : path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.')))
});

// POST /api/uploads  (multipart, campo "file") => { ok, url }
router.post('/', verifyToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el máximo de 5 MB.' : err.message;
      return res.status(400).json({ ok: false, message });
    }
    if (!req.file) return res.status(400).json({ ok: false, message: 'No se recibió ninguna imagen.' });
    const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ ok: true, url: `${base}/uploads/${req.file.filename}` });
  });
});

module.exports = { router, UPLOAD_DIR };