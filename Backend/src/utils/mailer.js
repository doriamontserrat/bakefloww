const nodemailer = require('nodemailer');

// Envío de correos por SMTP. Configura en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y (opcional) MAIL_FROM.
// Si no hay SMTP configurado no se envía nada (solo se avisa en consola) y la aplicación sigue funcionando.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transporter;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.sendMail = async ({ to, subject, text }) => {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mailer] SMTP no configurado: no se envió "${subject}" a ${to}`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `BakeFlow <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: `<div style="font-family:sans-serif;max-width:520px"><h2 style="color:#ec4899">${escapeHtml(subject)}</h2><p>${escapeHtml(text)}</p><hr><small>BakeFlow</small></div>`
    });
    return true;
  } catch (error) {
    console.error('[mailer] Error al enviar correo:', error.message);
    return false;
  }
};
