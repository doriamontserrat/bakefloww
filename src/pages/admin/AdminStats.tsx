import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { TrendingUp, Lock, DollarSign, Star, Flower2, Crown, Filter } from "lucide-react";

interface Point { month: string; revenue: number; orders: number; bakeries: number; }
interface Kpis { conversionPct: number; retentionPct: number; avgTicket: number; totalOrders: number; }

const fmtMoney = (v: number) => (v >= 10000 ? `${(v / 1000).toFixed(0)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));
const METRIC_OPTIONS = [
  { key: "revenue", label: "Ingresos", prefix: "$", format: fmtMoney },
  { key: "orders",  label: "Pedidos",  prefix: "",  format: (v: number) => String(v) },
  { key: "bakeries",label: "Pastelerías", prefix: "", format: (v: number) => String(v) },
];

export default function AdminStats() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [years, setYears] = useState<string[]>([String(new Date().getFullYear())]);
  const [metric, setMetric] = useState("revenue");
  const [data, setData] = useState<Point[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ conversionPct: 0, retentionPct: 0, avgTicket: 0, totalOrders: 0 });
  const [plans, setPlans] = useState<{ plan: string; label: string; count: number }[]>([]);
  const [error, setError] = useState("");

  // Serie anual y KPIs según el año elegido
  useEffect(() => {
    api<{ series: Point[]; kpis: Kpis; years: number[] }>(`/admin/stats?year=${year}`)
      .then((r) => { setData(r.series); setKpis(r.kpis); setYears(r.years.map(String)); })
      .catch((e) => setError(e.message));
  }, [year]);

  useEffect(() => {
    api<{ subscriptionsByPlan: { plan: string; label: string; count: number }[] }>("/admin/overview")
      .then((r) => setPlans(r.subscriptionsByPlan))
      .catch((e) => setError(e.message));
  }, []);

  const m = METRIC_OPTIONS.find(o => o.key === metric)!;
  const values = data.map(d => d[metric as keyof Point] as number);
  const maxVal = Math.max(1, ...values);
  const plansTotal = plans.reduce((s, p) => s + p.count, 0) || 1;
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Estadísticas</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Tendencias de crecimiento de BakeFlow</p>
      </div>

      {error && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Conversión a plan de pago",  value: `${kpis.conversionPct}%`,  sub: "Pastelerías en Pro o Premium", Icon: TrendingUp },
          { label: "Retención de suscripciones", value: `${kpis.retentionPct}%`,  sub: "Suscripciones activas",  Icon: Lock },
          { label: "Ticket promedio",    value: `$${kpis.avgTicket.toLocaleString()}`, sub: "Por pedido",      Icon: DollarSign },
          { label: "Pedidos totales",    value: kpis.totalOrders.toLocaleString(),   sub: "Sin cancelados",       Icon: Star },
        ].map(({ label, value, sub, Icon }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-5">
            <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center mb-2">
              <Icon size={18} className="text-pink-400" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs font-bold text-foreground mt-0.5">{label}</div>
            <div className="text-xs text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-3xl card-shadow border border-border p-6 mb-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <DollarSign size={18} className="text-pink-400" /> Tendencia mensual
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Filter size={12} /> Filtros:
            </div>
            {/* Year filter */}
            <div className="flex bg-muted rounded-xl p-0.5 gap-0.5">
              {years.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${year === y ? "bg-pink-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                  {y}
                </button>
              ))}
            </div>
            {/* Metric filter */}
            <div className="flex bg-muted rounded-xl p-0.5 gap-0.5">
              {METRIC_OPTIONS.map(o => (
                <button key={o.key} onClick={() => setMetric(o.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${metric === o.key ? "bg-pink-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 h-48">
          {data.map((d, i) => {
            const val = values[i];
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-muted-foreground">{m.prefix}{m.format(val)}</div>
                <div className="w-full flex items-end justify-center" style={{ height: "140px" }}>
                  <div className="w-full bg-pink-500 hover:bg-pink-600 rounded-t-xl transition-all"
                    style={{ height: `${(val / maxVal) * 100}%` }} />
                </div>
                <div className="text-xs font-bold text-foreground">{d.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => ({
          plan: p.label, count: p.count, pct: Math.round((p.count / plansTotal) * 100),
          color: p.plan === "basic" ? "bg-pink-300" : p.plan === "pro" ? "bg-violet-400" : "bg-amber-400",
          Icon: p.plan === "basic" ? Flower2 : p.plan === "pro" ? Star : Crown,
        })).map(({ plan, count, pct, color, Icon }) => (
          <div key={plan} className="bg-card rounded-3xl card-shadow border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-muted-foreground" />
                <span className="font-bold text-foreground">{plan}</span>
              </div>
              <span className="font-display text-xl font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="text-sm text-muted-foreground font-medium">{count} pastelerías</div>
          </div>
        ))}
      </div>
    </div>
  );
}
