import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Package, Calendar } from "lucide-react";
import { api } from "../../services/api";
import { isDeadStatus, DB_TO_UI, orderCode, orderTitle, dateKeyOf, clientName } from "../../services/orders";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface CalOrder { id: string; client: string; cake: string; status: string; }

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  progress: "badge-progress",
  ready: "badge-ready",
  delivered: "badge-delivered",
};
const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  progress: "bg-blue-400",
  ready: "bg-green-400",
  delivered: "bg-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", progress: "En proceso", ready: "Listo", delivered: "Entregado",
};

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function OrdersCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [ordersData, setOrdersData] = useState<Record<string, CalOrder[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ orders: any[] }>("/orders")
      .then(({ orders }) => {
        const grouped: Record<string, CalOrder[]> = {};
        for (const o of orders) {
          if (isDeadStatus(o.status)) continue;
          (grouped[dateKeyOf(o.deliveryDate)] ||= []).push({
            id: orderCode(o), client: clientName(o), cake: orderTitle(o), status: DB_TO_UI[o.status] || "pending",
          });
        }
        setOrdersData(grouped);
      })
      .catch((e) => setError(e.message));
  }, []);

  const isAtMinMonth = year === today.getFullYear() && month === today.getMonth();

  function prevMonth() {
    if (isAtMinMonth) return;
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedKey(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedKey(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const selectedOrders = selectedKey ? (ordersData[selectedKey] ?? []) : [];
  const selectedDay = selectedKey ? Number(selectedKey.split("-")[2]) : null;

  // Count total orders this month
  const monthOrders = Object.entries(ordersData)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .flatMap(([, v]) => v);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <Calendar size={26} className="text-pink-400" /> Calendario
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          {monthOrders.length} pedido{monthOrders.length !== 1 ? "s" : ""} este mes
        </p>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-card rounded-3xl card-shadow border border-border p-4 md:p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} disabled={isAtMinMonth}
              className="w-9 h-9 bg-muted hover:bg-pink-50 hover:text-pink-500 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth}
              className="w-9 h-9 bg-muted hover:bg-pink-50 hover:text-pink-500 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const key = dateKey(year, month, day);
              const orders = ordersData[key] ?? [];
              const isSelected = key === selectedKey;
              const isToday = isCurrentMonth && day === todayDate;
              const isPast = isCurrentMonth && day < todayDate;

              return (
                <button key={i} onClick={() => !isPast && setSelectedKey(key)} disabled={isPast}
                  className={`aspect-square rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all text-xs
                    ${isPast
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : isSelected
                      ? "bg-pink-500 text-white shadow-md scale-105"
                      : isToday
                      ? "bg-pink-50 text-pink-600 border-2 border-pink-300 font-bold"
                      : orders.length > 0
                      ? "bg-muted hover:bg-pink-50 text-foreground font-bold"
                      : "hover:bg-muted text-foreground font-medium"}`}>
                  <span className="font-bold">{day}</span>
                  {orders.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {orders.slice(0, 3).map((o, j) => (
                        <div key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : STATUS_DOT[o.status] ?? "bg-pink-400"}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-3xl card-shadow border border-border p-4 md:p-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
              <Package size={15} className="text-pink-400" />
              {selectedDay
                ? `${selectedDay} de ${MONTH_NAMES[month]}`
                : "Selecciona un día"}
            </h3>
            {selectedOrders.length > 0 ? (
              <div className="space-y-3">
                {selectedOrders.map((o) => (
                  <div key={o.id} className="p-3 bg-muted rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-pink-500">{o.id}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{o.cake}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{o.client}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package size={32} className="mx-auto mb-2 text-pink-200" />
                <div className="text-sm font-medium">
                  {selectedKey ? "Sin pedidos este día" : "Selecciona un día del calendario"}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-card rounded-3xl card-shadow border border-border p-4">
            <h3 className="font-bold text-xs text-foreground mb-3 uppercase tracking-wide">Leyenda</h3>
            <div className="space-y-2.5">
              {[
                { color: "bg-amber-400", label: "Pendiente" },
                { color: "bg-blue-400", label: "En proceso" },
                { color: "bg-green-400", label: "Listo" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
                  <div className={`w-3 h-3 rounded-full ${l.color} shrink-0`} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Month summary */}
          {monthOrders.length > 0 && (
            <div className="bg-gradient-to-br from-pink-50 to-violet-50 border border-pink-100 rounded-3xl p-4">
              <div className="text-xs font-bold text-pink-700 mb-2">Resumen del mes</div>
              <div className="font-display text-2xl font-bold text-pink-500">{monthOrders.length}</div>
              <div className="text-xs text-muted-foreground font-medium">pedidos en {MONTH_NAMES[month]}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
