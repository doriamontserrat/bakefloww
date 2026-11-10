// Validaciones compartidas del formulario. Devuelven un mensaje de error o "" si el valor es válido.
// (El backend repite las mismas reglas en Backend/src/utils/validators.js)

const NAME_RE = /^[\p{L}]+(?:[ '.\-][\p{L}]+)*\.?$/u;
const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const GENERIC_TLDS = ["com", "net", "org", "edu", "gov", "info", "biz"];
const ADDRESS_RE = /^[\p{L}\p{N} ,.#\-/°ºª]+$/u;

export const MIN_AGE = 13;
export const MAX_AGE = 110;

export function validateName(v: string, label = "El nombre"): string {
  const s = v.trim();
  if (!s) return `${label} es obligatorio.`;
  if (s.length < 2) return `${label} debe tener al menos 2 caracteres.`;
  if (s.length > 60) return `${label} no puede superar 60 caracteres.`;
  if (/\d/.test(s)) return `${label} no puede contener números.`;
  if (!NAME_RE.test(s)) return `${label} solo puede contener letras, espacios, guion, apóstrofo y punto.`;
  return "";
}

/** Nombre de negocio / etiqueta libre: permite números pero no símbolos raros. */
export function validateTitle(v: string, label = "El nombre", min = 2, max = 80): string {
  const s = v.trim();
  if (!s) return `${label} es obligatorio.`;
  if (s.length < min) return `${label} debe tener al menos ${min} caracteres.`;
  if (s.length > max) return `${label} no puede superar ${max} caracteres.`;
  if (!/[\p{L}]/u.test(s)) return `${label} debe incluir letras.`;
  if (!/^[\p{L}\p{N} '.,&()\-]+$/u.test(s)) return `${label} contiene caracteres no permitidos.`;
  return "";
}

export function validatePhone(v: string, required = false): string {
  const s = v.trim();
  if (!s) return required ? "El teléfono es obligatorio." : "";
  if (!/^\+?[\d\s\-().]+$/.test(s) || s.indexOf("+") > 0) return "El teléfono solo puede contener números (y + al inicio).";
  if (/^[\s\-.]/.test(s)) return "El teléfono no puede empezar con un guion ni ser negativo.";
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return "El teléfono debe tener entre 10 y 13 dígitos.";
  if (/^(\d)\1+$/.test(digits)) return "Ingresa un teléfono válido.";
  return "";
}

export function validateAddress(v: string, required = false): string {
  const s = v.trim();
  if (!s) return required ? "La dirección es obligatoria." : "";
  if (s.length < 10) return "La dirección es muy corta (mínimo 10 caracteres: calle, número y colonia).";
  if (s.length > 150) return "La dirección no puede superar 150 caracteres.";
  if (!ADDRESS_RE.test(s)) return "La dirección solo puede incluir letras, números, espacios y , . # - /";
  if (!/[\p{L}]{3,}/u.test(s)) return "Ingresa una dirección válida (con el nombre de la calle).";
  return "";
}

export function validateEmail(v: string): string {
  const s = v.trim();
  if (!s) return "El correo es obligatorio.";
  if (s.length > 254) return "El correo es demasiado largo.";
  if (s.includes("..") || !EMAIL_RE.test(s)) return "Ingresa un correo válido (ej. nombre@correo.com).";
  const labels = s.split("@")[1].toLowerCase().split(".");
  const last = labels[labels.length - 1];
  const prev = labels[labels.length - 2];
  if (labels.length >= 3 && GENERIC_TLDS.includes(prev) && GENERIC_TLDS.includes(last)) {
    return "El correo tiene una terminación repetida (ej. .com.com). Revísalo.";
  }
  return "";
}

export function validatePassword(v: string): string {
  if (v.length < 8) return "La contraseña debe tener mínimo 8 caracteres.";
  if (v.length > 64) return "La contraseña no puede superar 64 caracteres.";
  if (/\s/.test(v)) return "La contraseña no puede contener espacios.";
  if (!/[A-Za-zÀ-ɏ]/.test(v)) return "La contraseña debe incluir al menos una letra.";
  if (!/\d/.test(v)) return "La contraseña debe incluir al menos un número.";
  if (!/[^A-Za-z0-9À-ɏ]/.test(v)) return "La contraseña debe incluir al menos un carácter especial (ej. ! @ # $ %).";
  return "";
}

/** yyyy-mm-dd de una fecha local */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function maxBirthday(): string { const d = new Date(); d.setFullYear(d.getFullYear() - MIN_AGE); return toISODate(d); }
export function minBirthday(): string { const d = new Date(); d.setFullYear(d.getFullYear() - MAX_AGE); return toISODate(d); }

export function validateBirthday(v: string, required = false): string {
  if (!v) return required ? "La fecha de nacimiento es obligatoria." : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Fecha de nacimiento inválida.";
  const [y, m, d] = v.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return "Fecha de nacimiento inválida.";
  if (v > maxBirthday()) return `Debes tener al menos ${MIN_AGE} años.`;
  if (v < minBirthday()) return "La fecha de nacimiento no es realista.";
  return "";
}

/** Precio / monto positivo */
export function validatePrice(v: string | number, label = "El precio"): string {
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (String(v).trim() === "" || Number.isNaN(n)) return `${label} debe ser un número.`;
  if (n <= 0) return `${label} debe ser mayor a 0.`;
  if (n > 1_000_000) return `${label} es demasiado alto.`;
  return "";
}

/** Devuelve el primer error de una lista (cadenas vacías = sin error). */
export const firstError = (...errors: string[]): string => errors.find(Boolean) || "";

/** Para onChange: solo deja pasar caracteres de teléfono. */
export const sanitizePhone = (v: string) => v.replace(/[^\d+\s\-().]/g, "");

/** Para onChange genérico por nombre de campo: nombres sin números, teléfonos solo con caracteres válidos. */
export function sanitizeField(key: string, value: string): string {
  if (key === "name" || key === "ownerName") return value.replace(/[0-9]/g, "");
  if (key === "phone") return sanitizePhone(value);
  return value;
}
