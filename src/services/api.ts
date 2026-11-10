import { API_URL } from "../pages/authService";

export function getToken(): string | null {
  return localStorage.getItem("bakeflow_token");
}

export function getStoredUser(): { id: string; name: string; email: string; role: string; bakeryId: string | null } | null {
  try {
    return JSON.parse(localStorage.getItem("bakeflow_user") || "null");
  } catch {
    return null;
  }
}

export const UNAUTHORIZED_EVENT = "bakeflow:unauthorized";

export function clearSession() {
  localStorage.removeItem("bakeflow_token");
  localStorage.removeItem("bakeflow_user");
}

/** Petición autenticada al backend. Lanza Error con el mensaje del servidor si falla. */
export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }
  // Token vencido o inválido: cerrar la sesión de forma global
  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const validation = Array.isArray(data.errors) ? data.errors.map((e: { msg: string }) => e.msg).join(". ") : "";
    throw new Error(validation || data.message || "Ocurrió un error inesperado.");
  }
  return data as T;
}

/** Sube una imagen al backend (máx. 5 MB, JPG/PNG/WEBP/GIF) y devuelve su URL pública. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen supera el máximo de 5 MB.");
  const body = new FormData();
  body.append("file", file);
  const token = getToken();
  let response: Response;
  try {
    // Sin Content-Type: el navegador agrega el boundary del multipart
    response = await fetch(`${API_URL}/uploads`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }
  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.message || "No se pudo subir la imagen.");
  return data.url as string;
}

// ---- Plan de la pastelería (viene del servidor al iniciar sesión) ----------------------------

export interface PlanInfo { key: string; name: string; features: string[]; expiresAt: string | null; cancelAtPeriodEnd?: boolean; }

export function getPlan(): PlanInfo | null {
  try {
    return (JSON.parse(localStorage.getItem("bakeflow_user") || "null")?.plan as PlanInfo | null) ?? null;
  } catch {
    return null;
  }
}

/** ¿El plan de la sesión incluye esta función? (el servidor la valida de nuevo en cada petición) */
export const hasFeature = (feature: string): boolean => !!getPlan()?.features.includes(feature);

/** Guarda el plan actualizado que devuelve /auth/me en la sesión guardada. */
export function saveStoredPlan(plan: PlanInfo | null) {
  try {
    const user = JSON.parse(localStorage.getItem("bakeflow_user") || "null");
    if (user) localStorage.setItem("bakeflow_user", JSON.stringify({ ...user, plan }));
  } catch { /* sin sesión guardada */ }
}

/** Cierra la sesión y vuelve al login (lo escucha App.tsx). Se usa tras cambiar de plan. */
export function forceRelogin() {
  clearSession();
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
