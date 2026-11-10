// Validaciones del servidor (espejo de src/utils/validators.ts del frontend).
// Cada función devuelve un mensaje de error o '' si el valor es válido.

const NAME_RE = /^[\p{L}]+(?:[ '.\-][\p{L}]+)*\.?$/u;
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const GENERIC_TLDS = ['com', 'net', 'org', 'edu', 'gov', 'info', 'biz'];
const ADDRESS_RE = /^[\p{L}\p{N} ,.#\-/°ºª]+$/u;
const MIN_AGE = 13;
const MAX_AGE = 110;

const str = (v) => (typeof v === 'string' ? v : '');

function validateName(v, label = 'El nombre') {
  const s = str(v).trim();
  if (!s) return `${label} es obligatorio.`;
  if (s.length < 2) return `${label} debe tener al menos 2 caracteres.`;
  if (s.length > 60) return `${label} no puede superar 60 caracteres.`;
  if (/\d/.test(s)) return `${label} no puede contener números.`;
  if (!NAME_RE.test(s)) return `${label} solo puede contener letras, espacios, guion, apóstrofo y punto.`;
  return '';
}

function validateTitle(v, label = 'El nombre', min = 2, max = 80) {
  const s = str(v).trim();
  if (!s) return `${label} es obligatorio.`;
  if (s.length < min) return `${label} debe tener al menos ${min} caracteres.`;
  if (s.length > max) return `${label} no puede superar ${max} caracteres.`;
  if (!/[\p{L}]/u.test(s)) return `${label} debe incluir letras.`;
  if (!/^[\p{L}\p{N} '.,&()\-]+$/u.test(s)) return `${label} contiene caracteres no permitidos.`;
  return '';
}

function validatePhone(v, required = false) {
  const s = str(v).trim();
  if (!s) return required ? 'El teléfono es obligatorio.' : '';
  if (!/^\+?[\d\s\-().]+$/.test(s) || s.indexOf('+') > 0) return 'El teléfono solo puede contener números (y + al inicio).';
  if (/^[\s\-.]/.test(s)) return 'El teléfono no puede empezar con un guion ni ser negativo.';
  const digits = s.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return 'El teléfono debe tener entre 10 y 13 dígitos.';
  if (/^(\d)\1+$/.test(digits)) return 'Ingresa un teléfono válido.';
  return '';
}

function validateAddress(v, required = false) {
  const s = str(v).trim();
  if (!s) return required ? 'La dirección es obligatoria.' : '';
  if (s.length < 10) return 'La dirección es muy corta (mínimo 10 caracteres: calle, número y colonia).';
  if (s.length > 150) return 'La dirección no puede superar 150 caracteres.';
  if (!ADDRESS_RE.test(s)) return 'La dirección solo puede incluir letras, números, espacios y , . # - /';
  if (!/[\p{L}]{3,}/u.test(s)) return 'Ingresa una dirección válida (con el nombre de la calle).';
  return '';
}

function validateEmail(v) {
  const s = str(v).trim();
  if (!s) return 'El correo es obligatorio.';
  if (s.length > 254) return 'El correo es demasiado largo.';
  if (s.includes('..') || !EMAIL_RE.test(s)) return 'Ingresa un correo válido (ej. nombre@correo.com).';
  const labels = s.split('@')[1].toLowerCase().split('.');
  const last = labels[labels.length - 1];
  const prev = labels[labels.length - 2];
  if (labels.length >= 3 && GENERIC_TLDS.includes(prev) && GENERIC_TLDS.includes(last)) {
    return 'El correo tiene una terminación repetida (ej. .com.com). Revísalo.';
  }
  return '';
}

function validatePassword(v) {
  const s = str(v);
  if (s.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  if (s.length > 64) return 'La contraseña no puede superar 64 caracteres.';
  if (/\s/.test(s)) return 'La contraseña no puede contener espacios.';
  if (!/[A-Za-zÀ-ɏ]/.test(s)) return 'La contraseña debe incluir al menos una letra.';
  if (!/\d/.test(s)) return 'La contraseña debe incluir al menos un número.';
  if (!/[^A-Za-z0-9À-ɏ]/.test(s)) return 'La contraseña debe incluir al menos un carácter especial (ej. ! @ # $ %).';
  return '';
}

function validateBirthday(v, required = false) {
  if (!v) return required ? 'La fecha de nacimiento es obligatoria.' : '';
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return 'Fecha de nacimiento inválida.';
  const now = new Date();
  const max = new Date(now.getFullYear() - MIN_AGE, now.getMonth(), now.getDate(), 23, 59, 59);
  const min = new Date(now.getFullYear() - MAX_AGE, now.getMonth(), now.getDate());
  if (date > max) return `Debes tener al menos ${MIN_AGE} años.`;
  if (date < min) return 'La fecha de nacimiento no es realista.';
  return '';
}

function validatePrice(v, label = 'El precio') {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || Number.isNaN(n)) return `${label} debe ser un número.`;
  if (n <= 0) return `${label} debe ser mayor a 0.`;
  if (n > 1000000) return `${label} es demasiado alto.`;
  return '';
}

const firstError = (...errors) => errors.find(Boolean) || '';

// Valida los campos de perfil presentes en `data` (solo los enviados). Devuelve el primer error o ''.
function validateProfileFields(data) {
  return firstError(
    'name' in data ? validateName(data.name) : '',
    'phone' in data ? validatePhone(data.phone) : '',
    'address' in data ? validateAddress(data.address) : '',
    'birthday' in data ? validateBirthday(data.birthday) : ''
  );
}

module.exports = {
  validateName, validateTitle, validatePhone, validateAddress, validateEmail,
  validatePassword, validateBirthday, validatePrice, firstError, validateProfileFields
};
