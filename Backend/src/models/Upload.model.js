const mongoose = require('mongoose');

// Imágenes subidas. Se guardan en MongoDB (máx. 5 MB cada una) porque en Vercel el disco es efímero.
const uploadSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);
