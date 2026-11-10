import { useState, useEffect } from "react";
import { Clock, ChefHat, CheckCircle2, PartyPopper, XCircle, Cake } from "lucide-react";
import { api } from "../../services/api";
import { DATE_FILTERS, matchesDate, keyOf, compareByDate, type DateFilter } from "../../utils/dateFilter";

interface Step { label: string; done: boolean; time: string; }
interface OrderView { id: string; dbId: string; rawStatus: string; name: string; status: string; date: string; delivery: string; dateKey: string; total: string; steps: Step[]; }

const FLOW = [
  { label: "Pedido recibido", statuses: ["pending_quote", "pending", "in_preparation", "prepared", "ready", "delivered"] },
  { label: "En preparación", statuses: ["in_preparation", "prepared", "ready", "delivered"] },
  { label: "Listo para recoger", statuses: ["ready", "delivered"] },
  { label: "Entregado", statuses: ["delivered"] },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

function toView(o: any): OrderView {
  const status = ["in_preparation", "prepared"].includes(o.status) ? "progress"
    : ["pending_quote", "awaiting_client"].includes(o.status) ? "pending"
    : ["rejected", "declined"].includes(o.status) ? "cancelled" : o.status;
  const name = o.orderType === "custom"
    ? "Pastel personalizado"
    : (o.items || []).map((i: any) => i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(", ") || "Pedido";
  return {
    id: "#" + String(o._id).slice(-6).toUpperCase(),
    dbId: o._id, rawStatus: o.status,
    name, status,
    date: fmtDate(o.createdAt),
    delivery: fmtDate(o.deliveryDate),
    dateKey: keyOf(new Date(o.deliveryDate)),
    total: `$${o.totalPrice}`,
    steps: ["cancelled", "rejected", "declined"].includes(o.status)
      ? [{ label: "Cancelado", done: true, time: "" }]
      : FLOW.map((s) => ({ label: s.label, done: s.statuses.includes(o.status), time: "" })),
  };
}
const STATUS_MAP: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: "Pendiente", class: "badge-pending", Icon: Clock },
  progress: { label: "En proceso", class: "badge-progress", Icon: ChefHat },
  ready: { label: "Listo", class: "badge-ready", Icon: CheckCircle2 },
  delivered: { label: "Entregado", class: "badge-delivered", Icon: PartyPopper },
  cancelled: { label: "Cancelado", class: "badge-cancelled", Icon: XCircle },
};

// Solo se puede cancelar antes de que la pastelería empiece a prepararlo
const CANCELLABLE = ["pending_quote", "awaiting_client", "pending"];
const FILTERS = ["all", "pending", "progress", "ready", "delivered", "cancelled"] as const;

export default function MyOrders() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDay, setCustomDay] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    api<{ orders: any[] }>("/orders")
      .then(({ orders }) => {
        // Lo más reciente primero, para que una compra nueva aparezca arriba y seleccionada
        const views = [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map(toView);
        setOrders(views);
        setSelected(views[0]?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedOrder = orders.find((o) => o.id === selected);
  const visible = orders
    .filter((o) => matchesDate(o.dateKey, dateFilter, customDay) && (filter === "all" || o.status === filter))
    .sort(compareByDate(dateFilter));

  async function cancelOrder(order: OrderView) {
    setCancelling(true);
    setError("");
    try {
      await api(`/orders/${order.dbId}/cancel`, { method: "PATCH" });
      setOrders((prev) => prev.map((o) => o.id === order.id
        ? { ...o, status: "cancelled", rawStatus: "cancelled", steps: [{ label: "Cancelado", done: true, time: "" }] } : o));
      setConfirmCancel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar el pedido.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Mis pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Revisa el estado de tus pedidos en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
          {loading && <p className="text-sm text-muted-foreground">Cargando pedidos...</p>}
          {!loading && !error && orders.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes pedidos.</p>}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar por fecha de entrega">
            {DATE_FILTERS.map((f) => (
              <button key={f.val} onClick={() => setDateFilter(f.val)} role="tab" aria-selected={dateFilter === f.val}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  dateFilter === f.val ? "border-violet-400 bg-violet-50 text-violet-600" : "border-border text-muted-foreground hover:border-violet-200"
                }`}>
                {f.label}
              </button>
            ))}
            {dateFilter === "custom" && (
              <input type="date" value={customDay} onChange={(e) => setCustomDay(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-300 bg-card focus:outline-none" />
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filter === f ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"
                }`}>
                {f === "all" ? "Todos" : STATUS_MAP[f].label}
              </button>
            ))}
          </div>
          {!loading && orders.length > 0 && visible.length === 0 && <p className="text-sm text-muted-foreground">No tienes pedidos con estos filtros.</p>}
          {visible.map((order) => {
            const s = STATUS_MAP[order.status];
            return (
              <button key={order.id} onClick={() => { setSelected(order.id); setConfirmCancel(false); }}
                className={`w-full text-left p-4 rounded-3xl border-2 transition-all card-shadow ${selected === order.id ? "border-pink-400 bg-pink-50" : "border-border bg-card hover:border-pink-200"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Cake size={22} className="text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{order.name}</div>
                    <div className="text-xs text-muted-foreground">{order.id} · {order.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${s.class}`}>
                      <s.Icon size={10} /> {s.label}
                    </span>
                    <span className="font-display text-sm font-semibold text-foreground">{order.total}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedOrder && (
          <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-border p-6">
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Cake size={32} className="text-pink-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">{selectedOrder.name}</h2>
                <div className="text-sm text-muted-foreground font-medium">{selectedOrder.id}</div>
                <div className="flex items-center gap-3 mt-1">
                  {(() => { const s = STATUS_MAP[selectedOrder.status]; return (
                    <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${s.class}`}>
                      <s.Icon size={11} /> {s.label}
                    </span>
                  ); })()}
                  <span className="font-display text-base font-semibold text-pink-500">{selectedOrder.total}</span>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-sm text-foreground mb-4">Seguimiento del pedido</h3>
            <div className="space-y-0">
              {selectedOrder.steps.map((step, i) => (
                <div key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${step.done ? "bg-pink-500 text-white" : "bg-muted text-muted-foreground border-2 border-border"}`}>
                      {step.done ? <CheckCircle2 size={16} /> : <span className="text-xs">{i + 1}</span>}
                    </div>
                    {i < selectedOrder.steps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${step.done ? "bg-pink-300" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className={`font-semibold text-sm ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</div>
                    {step.time && <div className="text-xs text-muted-foreground mt-0.5">{step.time}</div>}
                  </div>
                </div>
              ))}
            </div>

            {CANCELLABLE.includes(selectedOrder.rawStatus) && (
              <div className="mt-2 mb-4">
                {!confirmCancel ? (
                  <button onClick={() => setConfirmCancel(true)}
                    className="w-full py-2.5 bg-white border-2 border-pink-400 text-pink-500 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-pink-50 transition-all">
                    <XCircle size={14} /> Cancelar pedido
                  </button>
                ) : (
                  <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-pink-700 mb-3">¿Seguro que quieres cancelar este pedido? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-2.5">
                      <button onClick={() => cancelOrder(selectedOrder)} disabled={cancelling}
                        className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                        {cancelling ? "Cancelando..." : "Sí, cancelar"}
                      </button>
                      <button onClick={() => setConfirmCancel(false)} disabled={cancelling}
                        className="flex-1 py-2.5 bg-white border-2 border-border text-muted-foreground font-bold rounded-2xl text-sm">
                        Volver
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-2xl p-3">
                <div className="text-xs text-muted-foreground font-semibold">Fecha del pedido</div>
                <div className="font-bold text-sm text-foreground mt-1">{selectedOrder.date}</div>
              </div>
              <div className="bg-muted rounded-2xl p-3">
                <div className="text-xs text-muted-foreground font-semibold">Fecha de entrega</div>
                <div className="font-bold text-sm text-foreground mt-1">{selectedOrder.delivery}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
