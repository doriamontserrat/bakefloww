import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { isDeadStatus, orderCode, orderTitle, clientName } from "../../services/orders";
import { Package, DollarSign, Clock, Users, Cake, Calendar, Sparkles, BarChart2, ArrowRight, Star, TrendingUp } from "lucide-react";

interface Props {
  userName: string;
  onNavigate: (page: string) => void;
}

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const sameMonth = (iso: string, ref: Date) => { const d = new Date(iso); return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth(); };
function trendOf(cur: number, prev: number): string | null {
  if (prev <= 0) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export default function BakeryHome({ userName, onNavigate }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<{ orders: any[] }>("/orders"), api<{ records: any[] }>("/finances")])
      .then(([o, f]) => { setOrders(o.orders); setRecords(f.records); })
      .catch((e) => setError(e.message));
  }, []);

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const prevName = prevMonth.toLocaleDateString("es-MX", { month: "long" });

  const ordersNow = orders.filter((o) => sameMonth(o.createdAt, now));
  const ordersPrev = orders.filter((o) => sameMonth(o.createdAt, prevMonth));
  const incomeOf = (ref: Date) => records.filter((r) => r.type === "income" && sameMonth(r.date, ref)).reduce((s, r) => s + r.amount, 0);
  const incomeNow = incomeOf(now);
  const incomePrev = incomeOf(prevMonth);
  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "pending_quote").length;
  const activeCustomers = new Set(ordersNow.map((o) => o.customerId?._id).filter(Boolean)).size;
  const diff = ordersNow.length - ordersPrev.length;

  const stats = [
    { label: "Pedidos este mes",   value: String(ordersNow.length), sub: `${diff >= 0 ? "+" : ""}${diff} vs ${prevName}`, Icon: Package, color: "bg-pink-500", trend: trendOf(ordersNow.length, ordersPrev.length) },
    { label: "Ingresos del mes",   value: money(incomeNow), sub: `vs ${money(incomePrev)} en ${prevName}`, Icon: DollarSign, color: "bg-violet-500", trend: trendOf(incomeNow, incomePrev) },
    { label: "Pedidos pendientes", value: String(pendingCount), sub: "Requieren atención", Icon: Clock, color: "bg-amber-400", trend: null },
    { label: "Clientes activos",   value: String(activeCustomers), sub: "Este mes", Icon: Users, color: "bg-indigo-500", trend: null },
  ];
  const quickActions = [
    { Icon: Cake,     label: "Gestionar menú",    page: "menu-mgmt",       desc: "Agrega o edita productos" },
    { Icon: Calendar, label: "Ver calendario",    page: "orders-cal",       desc: "Pedidos programados" },
    { Icon: Sparkles, label: "Pedidos especiales", page: "custom-requests", desc: "Solicitudes personalizadas" },
    { Icon: BarChart2, label: "Finanzas",          page: "finances",         desc: "Ingresos y gastos" },
  ];

  // Próximas entregas: pedidos vivos ordenados por fecha de entrega (el backend ya los ordena)
  const pending = orders
    .filter((o) => !isDeadStatus(o.status) && o.status !== "delivered")
    .slice(0, 5)
    .map((o) => ({
      id: orderCode(o), client: clientName(o), cake: orderTitle(o),
      date: new Date(o.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      employee: o.assignedEmployeeId?.name || "Sin asignar",
    }));
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 space-y-8">

      {/* ── HERO ────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-violet-600 via-pink-500 to-rose-400 rounded-3xl overflow-hidden p-6 md:p-8">
        <div className="absolute top-0 right-0 w-52 h-52 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-16 w-36 h-36 bg-pink-300/20 rounded-full translate-y-1/3" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-semibold">Panel de gestión</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mt-0.5">
              Hola, {userName.split(" ")[0]}!
            </h1>
            <p className="text-white/80 text-sm mt-2 font-medium">Resumen de tu pastelería — {monthName}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white/20 border border-white/30 rounded-2xl backdrop-blur-sm">
            <Star size={14} className="text-amber-300 fill-amber-300" />
            <span className="text-white text-sm font-bold">Plan Pro</span>
            <button onClick={() => onNavigate("subscription")} className="text-white/70 hover:text-white text-xs underline ml-1 transition-colors">Gestionar</button>
          </div>
        </div>
      </div>

      {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {/* ── KPI CARDS ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ label, value, sub, Icon, color, trend }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-4 md:p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 md:w-11 md:h-11 ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
                <Icon size={18} className="text-white" />
              </div>
              {trend && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  <TrendingUp size={9} /> {trend}
                </span>
              )}
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs font-bold text-foreground mt-0.5 leading-snug">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── QUICK ACTIONS ───────────────────────── */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ Icon, label, page, desc }) => (
            <button key={page} onClick={() => onNavigate(page)}
              className="bg-card rounded-3xl border border-border card-shadow p-4 md:p-5 text-left hover:scale-[1.03] hover:border-pink-200 transition-all group">
              <div className="w-11 h-11 bg-pink-50 border border-border rounded-2xl flex items-center justify-center mb-3 group-hover:bg-pink-100 transition-colors">
                <Icon size={20} className="text-pink-400" />
              </div>
              <div className="font-bold text-sm text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PENDING ORDERS ──────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Próximas entregas</h2>
          <button onClick={() => onNavigate("orders-mgmt")} className="flex items-center gap-1 text-sm text-pink-500 font-bold hover:text-pink-600 transition-colors">
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
          <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
            <span>Pedido</span><span className="col-span-2">Cliente / Descripción</span><span>Fecha</span><span>Empleado</span>
          </div>
          {pending.length === 0 && <div className="px-5 py-6 text-sm text-muted-foreground">No hay entregas próximas.</div>}
          {pending.map((o, i) => (
            <div key={o.id} className={`grid grid-cols-5 gap-3 px-5 py-4 items-center ${i < pending.length - 1 ? "border-b border-border" : ""}`}>
              <span className="font-bold text-sm text-pink-500">{o.id}</span>
              <div className="col-span-2 min-w-0">
                <div className="font-bold text-sm text-foreground">{o.client}</div>
                <div className="text-xs text-muted-foreground truncate">{o.cake}</div>
              </div>
              <span className="text-sm text-muted-foreground">{o.date}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${o.employee === "Sin asignar" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                {o.employee}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
