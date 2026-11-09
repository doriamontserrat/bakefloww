import { useState, useEffect } from "react";
import { Clock, ChefHat, CheckCircle2, PartyPopper, XCircle, Cake, Phone, User, CreditCard, Lock, ChevronLeft, X, UserCheck, CheckCheck } from "lucide-react";
import { api } from "../../services/api";


type OrderStatus = "pending" | "accepted" | "progress" | "ready" | "delivered" | "cancelled";

interface OrderRow {
  id: string; dbId: string; client: string; cake: string; date: string; status: OrderStatus;
  employee: string; total: string; phone: string;
}

const UI_TO_DB: Record<OrderStatus, string> = {
  pending: "pending", accepted: "in_preparation", progress: "in_preparation",
  ready: "ready", delivered: "delivered", cancelled: "cancelled",
};
const DB_TO_UI: Record<string, OrderStatus> = {
  pending_quote: "pending", awaiting_client: "pending", pending: "pending", in_preparation: "progress",
  ready: "ready", delivered: "delivered", cancelled: "cancelled", rejected: "cancelled", declined: "cancelled",
};

function toRow(o: any): OrderRow {
  return {
    id: "#" + String(o._id).slice(-6).toUpperCase(),
    dbId: o._id,
    client: o.customerId?.name || "Cliente",
    cake: o.orderType === "custom"
      ? "Pastel personalizado"
      : (o.items || []).map((i: any) => i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name).join(", ") || "Pedido",
    date: new Date(o.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    status: DB_TO_UI[o.status] || "pending",
    employee: o.assignedEmployeeId?.name || "Sin asignar",
    total: `${(o.totalPrice || 0).toLocaleString()}`,
    phone: o.customerId?.phone || "—",
  };
}

const STATUS_MAP: Record<OrderStatus, { label: string; class: string; Icon: React.ComponentType<{ size?: number }> }> = {
  pending:   { label: "Pendiente",  class: "badge-pending",   Icon: Clock },
  accepted:  { label: "Aceptado",   class: "badge-progress",  Icon: CheckCheck },
  progress:  { label: "En proceso", class: "badge-progress",  Icon: ChefHat },
  ready:     { label: "Listo",      class: "badge-ready",     Icon: CheckCircle2 },
  delivered: { label: "Entregado",  class: "badge-delivered", Icon: PartyPopper },
  cancelled: { label: "Cancelado",  class: "badge-cancelled", Icon: XCircle },
};

const WORK_STATUSES: OrderStatus[] = ["accepted", "progress", "ready", "delivered"];

function formatCard(v: string) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
function formatExpiry(v: string) { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; }

export default function OrdersManagement() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ orders: any[] }>("/orders"),
      api<{ users: { _id: string; name: string }[] }>("/users").catch(() => ({ users: [] })),
    ])
      .then(([o, u]) => {
        const rows = o.orders.map(toRow);
        setOrders(rows);
        setSelected(rows[0]?.id ?? null);
        setEmployees(u.users);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const EMPLOYEES = ["Sin asignar", ...employees.map((e) => e.name)];
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [payStep, setPayStep] = useState<"form" | "done">("form");
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiry: "", cvv: "" });

  const selectedOrder = orders.find(o => o.id === selected);
  const payOrder = showPayment ? orders.find(o => o.id === showPayment) : null;

  const cardValid = cardForm.number.replace(/\s/g, "").length === 16
    && cardForm.name.trim().length > 1
    && cardForm.expiry.length === 5
    && cardForm.cvv.length >= 3;

  async function update(id: string, body: object, patch: Partial<OrderRow>) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    setError("");
    try {
      await api("/orders/" + order.dbId, { method: "PUT", body });
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el pedido.");
    }
  }
  function changeStatus(id: string, status: OrderStatus) {
    update(id, { status: UI_TO_DB[status] }, { status });
  }
  function assignEmployee(id: string, employee: string) {
    if (employee === "Sin asignar") { update(id, { assignedEmployeeId: null }, { employee }); return; }
    const emp = employees.find((e) => e.name === employee);
    if (!emp) return;
    update(id, { assignedEmployeeId: emp._id }, { employee });
  }
  function acceptOrder(id: string) { changeStatus(id, "accepted"); }
  function rejectOrder(id: string) { changeStatus(id, "cancelled"); }
  function collectPayment() {
    if (!showPayment) return;
    changeStatus(showPayment, "delivered");
    setPayStep("done");
    setTimeout(() => {
      setShowPayment(null);
      setPayStep("form");
      setCardForm({ number: "", name: "", expiry: "", cvv: "" });
    }, 2500);
  }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Administra y asigna todos los pedidos de tu pastelería</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {error && <div className="lg:col-span-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
        {loading && <p className="lg:col-span-5 text-sm text-muted-foreground">Cargando pedidos...</p>}
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {orders.map(o => {
            const s = STATUS_MAP[o.status];
            return (
              <button key={o.id} onClick={() => setSelected(o.id)}
                className={`w-full text-left p-4 rounded-3xl border-2 transition-all ${selected === o.id ? "border-pink-400 bg-pink-50" : "border-border bg-card hover:border-pink-200 card-shadow"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center shrink-0">
                    <Cake size={18} className="text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-pink-500">{o.id}</span>
                      <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${s.class}`}>
                        <s.Icon size={10} /> {s.label}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-foreground truncate">{o.cake}</div>
                    <div className="text-xs text-muted-foreground">{o.client} · {o.date}</div>
                  </div>
                  <div className="font-display font-semibold text-sm text-foreground shrink-0">{o.total}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {selectedOrder && (
          <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-border p-6 h-fit">
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
              <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center">
                <Cake size={28} className="text-pink-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">{selectedOrder.cake}</h2>
                <div className="text-sm text-muted-foreground font-medium">{selectedOrder.id}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
                  <User size={12} /> Información del cliente
                </div>
                <div className="font-bold text-foreground">{selectedOrder.client}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Phone size={12} className="text-pink-400" /> {selectedOrder.phone}
                </div>
              </div>

              {/* Pending — accept / reject */}
              {selectedOrder.status === "pending" && (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                  <div className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                    <Clock size={14} /> Este pedido requiere tu aprobación
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded-xl p-3 text-center">
                      <div className="text-xs text-muted-foreground font-semibold">Fecha</div>
                      <div className="font-bold text-sm text-foreground">{selectedOrder.date}</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center">
                      <div className="text-xs text-muted-foreground font-semibold">Total</div>
                      <div className="font-display font-semibold text-pink-500">{selectedOrder.total}</div>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => acceptOrder(selectedOrder.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm transition-all active:scale-95">
                      <UserCheck size={15} /> Aceptar pedido
                    </button>
                    <button onClick={() => rejectOrder(selectedOrder.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-pink-400 text-pink-500 font-bold rounded-2xl text-sm hover:bg-pink-50 transition-all active:scale-95">
                      <XCircle size={15} /> Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Accepted — assign employee */}
              {selectedOrder.status === "accepted" && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
                  <div className="text-sm font-bold text-violet-700 flex items-center gap-2">
                    <UserCheck size={14} /> Pedido aceptado — asigna un empleado
                  </div>
                  <select value={selectedOrder.employee}
                    onChange={e => assignEmployee(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-violet-200 bg-white focus:outline-none focus:border-pink-400 text-sm font-medium">
                    {EMPLOYEES.map(emp => <option key={emp}>{emp}</option>)}
                  </select>
                  <button onClick={() => changeStatus(selectedOrder.id, "progress")}
                    disabled={selectedOrder.employee === "Sin asignar"}
                    className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                    <ChefHat size={14} /> Iniciar preparación
                  </button>
                </div>
              )}

              {/* In-progress or beyond — status selector */}
              {(selectedOrder.status === "progress" || selectedOrder.status === "ready") && (
                <>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">Estado del pedido</label>
                    <div className="flex flex-wrap gap-2">
                      {WORK_STATUSES.map(key => {
                        const val = STATUS_MAP[key];
                        return (
                          <button key={key} onClick={() => changeStatus(selectedOrder.id, key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedOrder.status === key ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"
                            }`}>
                            <val.Icon size={12} /> {val.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">Empleado asignado</label>
                    <select value={selectedOrder.employee} onChange={e => assignEmployee(selectedOrder.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium">
                      {EMPLOYEES.map(emp => <option key={emp}>{emp}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Ready — collect payment on pickup */}
              {selectedOrder.status === "ready" && (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
                  <div className="text-sm font-bold text-pink-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} /> ¡Listo para recoger!
                  </div>
                  <p className="text-xs text-pink-600 font-medium mb-3">Cuando el cliente venga a recoger, registra el cobro aquí.</p>
                  <button onClick={() => setShowPayment(selectedOrder.id)}
                    className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
                    <CreditCard size={14} /> Cobrar al recoger — {selectedOrder.total}
                  </button>
                </div>
              )}

              {/* Summary for delivered/cancelled */}
              {(selectedOrder.status === "delivered" || selectedOrder.status === "cancelled") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-2xl p-3">
                    <div className="text-xs text-muted-foreground font-semibold">Fecha</div>
                    <div className="font-bold text-sm text-foreground">{selectedOrder.date}</div>
                  </div>
                  <div className="bg-muted rounded-2xl p-3">
                    <div className="text-xs text-muted-foreground font-semibold">Total</div>
                    <div className="font-display font-semibold text-pink-500">{selectedOrder.total}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment modal for pickup */}
      {showPayment && payOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow p-6 border border-border animate-pop max-h-[90vh] overflow-y-auto">
            {payStep === "form" ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setShowPayment(null)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2 flex-1">
                    <CreditCard size={20} className="text-pink-500" /> Cobro al recoger
                  </h2>
                  <button onClick={() => setShowPayment(null)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 mb-5">
                  <div className="font-bold text-sm text-foreground">{payOrder.cake}</div>
                  <div className="text-xs text-muted-foreground">{payOrder.id} · {payOrder.client}</div>
                  <div className="font-display text-2xl font-bold text-pink-500 mt-1">{payOrder.total}</div>
                </div>

                {/* Card visual */}
                <div className="relative h-36 bg-pink-500 rounded-2xl p-5 mb-5 overflow-hidden shadow-md">
                  <div className="absolute top-3 right-3 opacity-20 w-16 h-16 rounded-full border-8 border-white" />
                  <div className="text-white/70 text-xs font-bold mb-2 tracking-widest">TARJETA DE CRÉDITO</div>
                  <div className="font-mono text-white text-base font-bold tracking-widest mb-3">{cardForm.number || "•••• •••• •••• ••••"}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white/60 text-xs">TITULAR</div>
                      <div className="text-white text-sm font-bold uppercase">{cardForm.name || "NOMBRE"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs">VENCE</div>
                      <div className="text-white text-sm font-bold">{cardForm.expiry || "MM/AA"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Número de tarjeta</label>
                    <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                      value={cardForm.number} onChange={e => setCardForm({ ...cardForm, number: formatCard(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono tracking-widest" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Nombre en la tarjeta</label>
                    <input type="text" placeholder="Como aparece en la tarjeta"
                      value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm uppercase tracking-wide" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">Vencimiento</label>
                      <input type="text" inputMode="numeric" placeholder="MM/AA"
                        value={cardForm.expiry} onChange={e => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">CVV</label>
                      <input type="password" inputMode="numeric" placeholder="•••"
                        value={cardForm.cvv} onChange={e => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono" />
                    </div>
                  </div>
                </div>

                <button onClick={collectPayment} disabled={!cardValid}
                  className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                  <Lock size={15} /> Confirmar cobro {payOrder.total}
                </button>
                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Lock size={10} /> Pago seguro y encriptado
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-2">¡Cobro registrado!</h2>
                <p className="text-muted-foreground text-sm font-medium">El pedido fue marcado como entregado.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
