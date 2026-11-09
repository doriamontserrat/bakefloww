export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export type Role = "customer" | "bakery" | "employee" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  bakeryId: string | null;
}

export interface AuthResponse {
  ok: boolean;
  message?: string;
  token: string;
  user: AuthUser;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  address?: string;
  birthday?: string;
  profilePhoto?: string;
  bakeryName?: string;
}

async function post(path: string, body: unknown): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verifica que el backend esté encendido.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const validation = Array.isArray(data.errors) ? data.errors.map((e: { msg: string }) => e.msg).join(". ") : "";
    throw new Error(validation || data.message || "Ocurrió un error inesperado.");
  }
  return data as AuthResponse;
}

function saveSession(data: AuthResponse) {
  localStorage.setItem("bakeflow_token", data.token);
  localStorage.setItem("bakeflow_user", JSON.stringify(data.user));
}

export const loginUser = async (email: string, password: string) => {
  const data = await post("/auth/login", { email, password });
  saveSession(data);
  return data;
};

export const registerUser = async (userData: RegisterData) => {
  const data = await post("/auth/register", userData);
  saveSession(data);
  return data;
};
