import { useState, useEffect } from "react";
import { api, getToken, clearSession, saveStoredPlan, UNAUTHORIZED_EVENT, type PlanInfo } from "./services/api";
import AuthPage from "./pages/AuthPage";
import CustomerApp from "./pages/customer/CustomerApp";
import BakeryApp from "./pages/bakery/BakeryApp";
import EmployeeApp from "./pages/employee/EmployeeApp";
import AdminApp from "./pages/admin/AdminApp";

type Role = "customer" | "bakery" | "employee" | "admin";

interface Session { role: Role; name: string; }

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(() => !!getToken());

  // Al cargar la página: si hay token guardado, validarlo con el backend y restaurar la sesión
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: { name: string; role: Role }; plan: PlanInfo | null }>("/auth/me")
      .then(({ user, plan }) => { saveStoredPlan(plan); setSession({ role: user.role, name: user.name }); })
      .catch(() => {}) // 401 ya limpia la sesión en api(); un fallo de red conserva el token
      .finally(() => setRestoring(false));
  }, []);

  // Token vencido o inválido detectado en cualquier petición: volver al login
  useEffect(() => {
    const onUnauthorized = () => setSession(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  function handleLogin(role: Role, name: string) { setSession({ role, name }); }
  function handleLogout() { clearSession(); setSession(null); }

  if (restoring) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>;
  if (!session) return <AuthPage onLogin={handleLogin} />;

  // Fíjate cómo ya no pasamos customRequests ni onUpdateRequests como props
  if (session.role === "customer") return <CustomerApp userName={session.name} onLogout={handleLogout} />;
  if (session.role === "bakery") return <BakeryApp userName={session.name} onLogout={handleLogout} />;
  if (session.role === "employee") return <EmployeeApp userName={session.name} onLogout={handleLogout} />;
  if (session.role === "admin") return <AdminApp userName={session.name} onLogout={handleLogout} />;

  return null;
}