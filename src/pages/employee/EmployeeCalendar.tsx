import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Package, Lightbulb, Calendar } from "lucide-react";
import { api } from "../../services/api";
import { isDeadStatus, DB_TO_UI, orderCode, orderTitle, dateKeyOf } from "../../services/orders";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

interface CalOrder { id: string; cake: string; status: string; }

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface Props { onNavigate?: (page: string) => void; }

export default function EmployeeCalendar({ onNavigate }: Props = {}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [ordersData, setOrdersData] = useState<Record<string, CalOrder[]>>({});
  const [error, setError] = useState("");

  // El backend ya devuelve solo los pedidos asignados a este empleado
  useEffect(() => {
    api<{ orders: any[] }>("/orders")
      .then(({ orders }) => {
        const grouped: Record<string, CalOrder[]> = {};
        for (const o of orders) {
          if (isDeadStatus(o.status)) continue;
          (grouped[dateKeyOf(o.deliveryDate)] ||= []).push({ id: orderCode(o), cake: orderTitle(o), status: DB_TO_UI[o.status] || "pending" });
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

  const monthEntries = Object.entries(ordersData)
    .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));

  const selectedOrders = selectedKey ? (ordersData[selectedKey] ?? []) : [];
  const selectedDay = selectedKey ? Number(selectedKey.split("-")[2]) : null;

  // Next upcoming task reminder
  const upcomingKey = monthEntries.find(([, orders]) => orders.some(o => o.status !== "ready"))?.[0];
  const upcomingDay = upcomingKey ? Number(upcomingKey.split("-")[2]) : null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <Calendar size={26} className="text-indigo-400" /> Mi calendario
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          Tus pedidos asignados — {MONTH_NAMES[month]} {year}
        </p>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card rounded-3xl card-shadow border border-border p-4 md:p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} disabled={isAtMinMonth}
              className="w-9 h-9 bg-muted hover:bg-indigo-50 hover:text-indigo-500 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {MONTH_NAMES[month]} {year}
            </h2>
            <button onClick={nextMonth}
              className="w-9 h-9 bg-muted hover:bg-indigo-50 hover:text-indigo-500 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
            ))}
          </div>

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
                      ? "bg-indigo-500 text-white shadow-md scale-105"
                      : isToday
                      ? "bg-indigo-50 text-indigo-600 border-2 border-indigo-300 font-bold"
                      : orders.length > 0
                      ? "bg-muted hover:bg-indigo-50 text-foreground font-bold"
                      : "hover:bg-muted text-foreground font-medium"}`}>
                  <span className="font-bold">{day}</span>
                  {orders.length > 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-indigo-500"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side */}
        <div className="space-y-4">
          {/* Reminder */}
          {upcomingDay && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-purple-700 text-sm mb-1">
                <Lightbulb size={16} className="text-purple-600 fill-purple-100" /> Próxima entrega
              </div>
              <div className="text-xs text-purple-700 font-medium">
                Tienes un pedido el {upcomingDay} de {MONTH_NAMES[month]}. Revisa los detalles.
              </div>
            </div>
          )}

          {/* Selected day detail */}
          <div className="bg-card rounded-3xl card-shadow border border-border p-4 md:p-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
              <Package size={15} className="text-indigo-400" />
              {selectedDay
                ? `${selectedDay} de ${MONTH_NAMES[month]}`
                : "Selecciona un día"}
            </h3>
            {selectedOrders.length > 0 ? (
              <div className="space-y-3">
                {selectedOrders.map((o) => (
                  <div key={o.id} className="p-3 bg-muted rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-indigo-500">{o.id}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${o.status === "progress" ? "badge-progress" : o.status === "ready" ? "badge-ready" : o.status === "delivered" ? "badge-delivered" : "badge-pending"}`}>
                        {o.status === "progress" ? "En proceso" : o.status === "ready" ? "Listo" : o.status === "delivered" ? "Entregado" : "Pendiente"}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{o.cake}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package size={32} className="mx-auto mb-2 text-indigo-200" />
                <div className="text-sm font-medium">
                  {selectedKey ? "Sin pedidos este día" : "Selecciona un día del calendario"}
                </div>
              </div>
            )}
          </div>

          {/* All month tasks */}
          {monthEntries.length > 0 && (
            <div className="bg-card rounded-3xl card-shadow border border-border p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
                <Package size={14} className="text-indigo-400" /> Mis pedidos del mes
              </h3>
              <div className="space-y-2">
                {monthEntries.map(([key, orders]) => {
                  const d = Number(key.split("-")[2]);
                  return orders.map((o) => (
                    <button key={o.id} onClick={() => { setSelectedKey(key); onNavigate?.("my-tasks"); }}
                      className="w-full text-left p-2.5 bg-muted hover:bg-blue-50 rounded-2xl transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-500">{o.id}</span>
                        <span className="text-xs text-muted-foreground">{d} {MONTH_NAMES[month].slice(0,3)}</span>
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate">{o.cake}</div>
                    </button>
                  ));
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}