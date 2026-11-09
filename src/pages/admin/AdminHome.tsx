import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Store, Users, Star, DollarSign, BarChart2, CreditCard, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";

interface Props { onNavigate: (page: string) => void; }

interface Overview {
  totals: {
    bakeries: number; newBakeriesThisMonth: number; users: number; newUsersThisWeek: number; activeSubscriptions: number; paidSubscriptions: number;
    mrr: number; monthRevenue: number; revenueChangePct: number | null; incidentsThisMonth: number; incidentsResolvedThisMonth: number;
  };
  revenueByMonth: { month: string; value: number }[];
  bakeryGrowth: { month: string; value: number }[];
  subscriptionsByPlan: { plan: string; label: string; count: number }[];
  recentBakeries: { id: string; name: string; plan: string; status: string; location: string; createdAt: string }[];
}

const PLAN_COLOR: Record<string, string> = { enterprise: "bg-amber-400", pro: "bg-violet-400", basic: "bg-pink-300" };
const EMPTY: Overview = {
  totals: { bakeries: 0, newBakeriesThisMonth: 0, users: 0, newUsersThisWeek: 0, activeSubscriptions: 0, paidSubscriptions: 0, mrr: 0, monthRevenue: 0, revenueChangePct: null, incidentsThisMonth: 0, incidentsResolvedThisMonth: 0 },
  revenueByMonth: [], bakeryGrowth: [], subscriptionsByPlan: [], recentBakeries: [],
};
export default function AdminHome({ onNavigate }: Props) {
  const [data, setData] = useState<Overview>(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview & { ok: boolean }>("/admin/overview").then(setData).catch((e) => setError(e.message));
  }, []);

  const T = data.totals;
  const REVENUE_DATA = data.revenueByMonth;
  const BAKERY_GROWTH = data.bakeryGrowth;
  const SUBS_DATA = data.subscriptionsByPlan.map((s) => ({ label: s.label, count: s.count, color: PLAN_COLOR[s.plan] }));
  const maxRevenue = Math.max(1, ...REVENUE_DATA.map((d) => d.value));
  const maxBakeries = Math.max(1, ...BAKERY_GROWTH.map((d) => d.value));
  const minBakeries = Math.min(...BAKERY_GROWTH.map((d) => d.value), maxBakeries);
  const subsTotal = SUBS_DATA.reduce((s, d) => s + d.count, 0);
  const monthName = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const paidPct = T.activeSubscriptions ? Math.round((T.paidSubscriptions / T.activeSubscriptions) * 100) : 0;

  const stats = [
    { label: "Pastelerías registradas", value: String(T.bakeries), sub: `+${T.newBakeriesThisMonth} este mes`, Icon: Store, color: "bg-pink-500" },
    { label: "Usuarios totales", value: T.users.toLocaleString(), sub: `+${T.newUsersThisWeek} esta semana`, Icon: Users, color: "bg-violet-500" },
    { label: "Suscripciones activas", value: String(T.activeSubscriptions), sub: `${paidPct}% Pro o Premium`, Icon: Star, color: "bg-amber-400" },
    { label: "Ingresos del mes", value: `$${Math.round(T.monthRevenue).toLocaleString()}`, sub: T.revenueChangePct === null ? "Comisiones + suscripciones" : `${T.revenueChangePct >= 0 ? "+" : ""}${T.revenueChangePct}% vs mes anterior`, Icon: DollarSign, color: "bg-indigo-500" },
    { label: "Incidencias del mes", value: String(T.incidentsThisMonth), sub: `${T.incidentsResolvedThisMonth} resueltas`, Icon: AlertTriangle, color: "bg-rose-500" },
  ];

  const recent = data.recentBakeries.map((b) => ({
    name: b.name, plan: b.plan, status: b.status, location: b.location || "—",
    date: new Date(b.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
  }));
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Panel BakeFlow</h1>
        <p className="text-muted-foreground mt-1 font-medium">Resumen general de la plataforma — {monthName}</p>
      </div>

      {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-5">
            <div className={`w-11 h-11 ${color} rounded-2xl flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs font-bold text-foreground mt-0.5">{label}</div>
            <div className="text-xs text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { Icon: Store, label: "Pastelerías", page: "bakeries" },
          { Icon: Star, label: "Suscripciones", page: "subscriptions" },
          { Icon: CreditCard, label: "Transacciones", page: "transactions" },
          { Icon: BarChart2, label: "Estadísticas", page: "stats" },
        ].map(({ Icon, label, page }) => (
          <button key={page} onClick={() => onNavigate(page)}
            className="bg-card rounded-3xl border border-border card-shadow p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform">
            <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center">
              <Icon size={20} className="text-pink-400" />
            </div>
            <span className="text-xs font-bold text-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-card rounded-3xl card-shadow border border-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Ingresos mensuales</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1.5 rounded-xl">
              <TrendingUp size={12} /> +18% este mes
            </div>
          </div>
          <div className="flex items-end gap-3 h-36">
            {REVENUE_DATA.map((d) => {
              const pct = (d.value / maxRevenue) * 100;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">${(d.value / 1000).toFixed(0)}k</span>
                  <div className="w-full flex flex-col justify-end bg-muted rounded-xl overflow-hidden" style={{ height: "96px" }}>
                    <div className="w-full bg-pink-500 rounded-t-xl" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription breakdown */}
        <div className="bg-card rounded-3xl card-shadow border border-border p-5">
          <h2 className="font-display text-lg font-semibold text-foreground mb-1">Suscripciones</h2>
          <p className="text-xs text-muted-foreground font-medium mb-5">Distribución por plan</p>
          <div className="space-y-4">
            {SUBS_DATA.map((s) => {
              const pct = Math.round((s.count / (subsTotal || 1)) * 100);
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="text-xs font-bold text-foreground">{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${s.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground font-medium">Total activas</div>
            <div className="font-display text-2xl font-bold text-foreground">{subsTotal}</div>
          </div>
        </div>
      </div>

      {/* Bakeries growth */}
      <div className="bg-card rounded-3xl card-shadow border border-border p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Crecimiento de pastelerías</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Pastelerías registradas por mes</p>
          </div>
          <button onClick={() => onNavigate("bakeries")} className="flex items-center gap-1 text-sm text-pink-500 font-bold hover:text-pink-600">
            Ver todas <ArrowRight size={14} />
          </button>
        </div>
        <div className="flex items-end gap-3 h-24">
          {BAKERY_GROWTH.map((d) => {
            const range = maxBakeries - minBakeries || 1;
            const pct = ((d.value - minBakeries) / range) * 70 + 30;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{d.value}</span>
                <div className="w-full flex flex-col justify-end bg-muted rounded-xl overflow-hidden" style={{ height: "60px" }}>
                  <div className="w-full bg-violet-500 rounded-t-xl" style={{ height: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent bakeries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Pastelerías recientes</h2>
          <button onClick={() => onNavigate("bakeries")} className="flex items-center gap-1 text-sm text-pink-500 font-bold hover:text-pink-600">
            Ver todas <ArrowRight size={14} />
          </button>
        </div>
        <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
            <span className="col-span-2">Pastelería</span><span>Plan</span><span>Estado</span><span>Registro</span>
          </div>
          {recent.map((b, i) => (
            <div key={b.name} className={`grid grid-cols-5 gap-4 px-5 py-4 items-center ${i < recent.length - 1 ? "border-b border-border" : ""}`}>
              <div className="col-span-2">
                <div className="font-bold text-sm text-foreground">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.location}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${b.plan === "Premium" ? "bg-amber-50 text-amber-700" : b.plan === "Pro" ? "bg-purple-50 text-purple-700" : "bg-muted text-muted-foreground"}`}>
                {b.plan}
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${b.status === "active" ? "badge-ready" : "badge-cancelled"}`}>
                {b.status === "active" ? "Activa" : "Suspendida"}
              </span>
              <span className="text-sm text-muted-foreground">{b.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}