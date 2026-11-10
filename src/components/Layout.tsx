import { useState, useEffect } from "react";
import {
  Home, Cake, Sparkles, Package, User, Calendar, Users,
  DollarSign, Star, BarChart2, AlertTriangle, CreditCard,
  Tag, LogOut, ChevronLeft, ChevronRight, Store, Menu, X, ShoppingBag,
} from "lucide-react";
import Logo from "./Logo";
import { api, hasFeature, isCashier, getStoredUser, updateStoredUser, USER_UPDATED_EVENT } from "../services/api";

type Role = "customer" | "bakery" | "employee" | "admin";

interface NavItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  feature?: string;  // función del plan que desbloquea esta sección
  cashierOnly?: boolean; // solo la empleada con puesto "Cajera"
}

interface LayoutProps {
  role: Role;
  userName: string;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
  notifications?: number;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  customer: [
    { id: "home", label: "Inicio", Icon: Home },
    { id: "menu", label: "Menú", Icon: Cake },
    { id: "custom-order", label: "Pastel especial", Icon: Sparkles },
    { id: "my-orders", label: "Mis pedidos", Icon: Package },
  ],
  bakery: [
    { id: "home", label: "Dashboard", Icon: Home },
    { id: "pos", label: "Ventas", Icon: ShoppingBag },
    { id: "menu-mgmt", label: "Mi menú", Icon: Cake },
    { id: "categories", label: "Categorías", Icon: Tag },
    { id: "orders-cal", label: "Calendario", Icon: Calendar },
    { id: "orders-mgmt", label: "Pedidos", Icon: Package },
    { id: "custom-requests", label: "Especiales", Icon: Sparkles },
    { id: "employees", label: "Empleados", Icon: Users },
    { id: "finances", label: "Finanzas", Icon: DollarSign, feature: "finance" },
    { id: "reports", label: "Reportes", Icon: BarChart2, feature: "stats" },
  ],
  employee: [
    { id: "calendar", label: "Calendario", Icon: Calendar },
    { id: "pos", label: "Ventas", Icon: ShoppingBag, cashierOnly: true },
    { id: "my-tasks", label: "Mis pedidos", Icon: Package },
  ],
  admin: [
    { id: "home", label: "Dashboard", Icon: Home },
    { id: "bakeries", label: "Pastelerías", Icon: Store },
    { id: "users", label: "Usuarios", Icon: Users },
    { id: "subscriptions", label: "Suscripciones", Icon: Star },
    { id: "transactions", label: "Transacciones", Icon: CreditCard },
    { id: "stats", label: "Estadísticas", Icon: BarChart2 },
    { id: "incidents", label: "Incidencias", Icon: AlertTriangle },
  ],
};

const ROLE_META: Record<Role, { label: string; gradient: string; light: string; activeColor: string; activeMobileText: string; activeMobileBar: string }> = {
  customer:  { label: "Cliente",        gradient: "from-pink-500 to-rose-500",     light: "bg-pink-50 text-pink-600",     activeColor: "bg-pink-500",   activeMobileText: "text-pink-500",   activeMobileBar: "bg-pink-400"   },
  bakery:    { label: "Pastelería",     gradient: "from-violet-500 to-pink-500",   light: "bg-violet-50 text-violet-600", activeColor: "bg-pink-500",   activeMobileText: "text-pink-500",   activeMobileBar: "bg-pink-400"   },
  employee:  { label: "Empleado",       gradient: "from-indigo-500 to-violet-500", light: "bg-indigo-50 text-indigo-600", activeColor: "bg-blue-500",   activeMobileText: "text-blue-500",   activeMobileBar: "bg-blue-400"   },
  admin:     { label: "Admin BakeFlow", gradient: "from-rose-500 to-pink-500",     light: "bg-rose-50 text-rose-600",     activeColor: "bg-pink-500",   activeMobileText: "text-pink-500",   activeMobileBar: "bg-pink-400"   },
};

/* Bottom tabs — show the 4 most relevant items on mobile */
const MOBILE_TABS: Record<Role, string[]> = {
  customer: ["home", "menu", "custom-order", "my-orders"],
  bakery:   ["home", "pos", "orders-mgmt", "custom-requests"],
  employee: ["pos", "calendar", "my-tasks"],
  admin:    ["home", "bakeries", "users", "stats"],
};

export default function Layout({ role, userName, activePage, onNavigate, onLogout, children, notifications = 0 }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [photo, setPhoto] = useState(() => getStoredUser()?.profilePhoto || "");

  // Foto del sidebar: la del usuario (o el logo, si es pastelería). Se carga al entrar y se refresca al editar el perfil.
  useEffect(() => {
    const sync = () => setPhoto(getStoredUser()?.profilePhoto || "");
    window.addEventListener(USER_UPDATED_EVENT, sync);
    (async () => {
      try {
        const { user } = await api<{ user: any }>("/auth/me");
        let img: string = user.profilePhoto || "";
        if (role === "bakery" && user.bakeryId) {
          const { bakery } = await api<{ bakery: any }>(`/bakeries/${user.bakeryId}`);
          img = bakery.logoUrl || "";
        }
        updateStoredUser({ profilePhoto: img });
      } catch { /* sin foto: se muestra la inicial */ }
    })();
    return () => window.removeEventListener(USER_UPDATED_EVENT, sync);
  }, [role]);
  // Las secciones que el plan no incluye se ocultan del menú
  const navItems = NAV_ITEMS[role]
    .filter((n) => !n.feature || role !== "bakery" || hasFeature(n.feature))
    .filter((n) => !n.cashierOnly || isCashier());
  const meta = ROLE_META[role];
  const mobileTabs = MOBILE_TABS[role].map((id) => navItems.find((n) => n.id === id)!).filter(Boolean);

  function navigate(id: string) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── MOBILE TOP BAR ─────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 h-14">
        <button onClick={() => setMobileOpen(true)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Menu size={18} />
        </button>
        <Logo size={30} className="rounded-xl shrink-0" />
        <span className="font-display text-lg font-bold text-pink-500 flex-1 leading-none">BakeFlow</span>
      </header>

      {/* ── MOBILE DRAWER OVERLAY ──────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-card flex flex-col shadow-2xl animate-slide-in">
            <SidebarContent
              role={role} meta={meta} userName={userName} photo={photo}
              navItems={navItems} activePage={activePage}
              notifications={notifications} collapsed={false}
              onNavigate={navigate} onLogout={onLogout}
              onToggleCollapse={() => {}}
              showCollapseBtn={false}
              headerRight={
                <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white/80 hover:text-white">
                  <X size={15} />
                </button>
              }
            />
          </aside>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out ${collapsed ? "w-[72px]" : "w-[260px]"} bg-card border-r border-border`}
        style={{ boxShadow: "2px 0 24px -4px rgba(236,72,153,0.1)" }}
      >
        <SidebarContent
          role={role} meta={meta} userName={userName} photo={photo}
          navItems={navItems} activePage={activePage}
          notifications={notifications} collapsed={collapsed}
          onNavigate={navigate} onLogout={onLogout}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          showCollapseBtn={true}
        />
      </aside>

      {/* ── MAIN ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-24 md:pb-0">
        <div className="min-h-full">
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border px-2 py-2 flex items-center justify-around">
        {mobileTabs.map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${active ? meta.activeMobileText : "text-muted-foreground hover:text-foreground"}`}>
              {active && <span className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 ${meta.activeMobileBar} rounded-full`} />}
              <Icon size={20} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Sidebar inner content (shared between desktop + mobile drawer) ── */
interface SidebarContentProps {
  role: Role;
  meta: typeof ROLE_META[Role];
  userName: string;
  photo: string;
  navItems: NavItem[];
  activePage: string;
  notifications: number;
  collapsed: boolean;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  onToggleCollapse: () => void;
  showCollapseBtn: boolean;
  headerRight?: React.ReactNode;
}

function SidebarContent({ role, meta, userName, photo, navItems, activePage, notifications, collapsed, onNavigate, onLogout, onToggleCollapse, showCollapseBtn, headerRight }: SidebarContentProps) {
  return (
    <>
      {/* Header */}
      <div className={`relative bg-gradient-to-br ${meta.gradient} px-4 py-5 shrink-0`}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-8 w-12 h-12 bg-white/10 rounded-full translate-y-1/3" />

        <div className="relative flex items-center gap-3">
          <div className="shrink-0 ring-2 ring-white/40 rounded-2xl">
            <Logo size={collapsed ? 36 : 42} className="rounded-2xl" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl font-bold text-white leading-tight">BakeFlow</div>
              <div className="text-xs text-white/70 font-semibold">{meta.label}</div>
            </div>
          )}
          {headerRight}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 rounded-2xl transition-all text-sm font-semibold relative
                ${collapsed ? "px-0 py-3 justify-center" : "px-3 py-2.5"}
                ${active
                  ? `${meta.activeColor} text-white shadow-sm`
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-border shrink-0 space-y-1">
        {!collapsed && (
          <button onClick={() => onNavigate("profile")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-1 bg-muted rounded-2xl hover:bg-pink-50 transition-colors text-left">
            {photo ? (
              <img src={photo} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-sm" />
            ) : (
              <div className={`w-8 h-8 bg-gradient-to-br ${meta.gradient} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-foreground truncate">{userName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{meta.label}</div>
            </div>
          </button>
        )}
        {showCollapseBtn && (
          <button onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2 rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-xs font-semibold py-2
              ${collapsed ? "justify-center px-0" : "px-3"}`}>
            {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Colapsar</span></>}
          </button>
        )}
        <button onClick={onLogout}
          className={`w-full flex items-center gap-2 rounded-2xl text-muted-foreground hover:bg-pink-50 hover:text-pink-500 transition-all text-xs font-semibold py-2
            ${collapsed ? "justify-center px-0" : "px-3"}`}>
          <LogOut size={15} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  );
}