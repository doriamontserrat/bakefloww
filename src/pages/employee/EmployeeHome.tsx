import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { isDeadStatus, DB_TO_UI, orderCode, orderTitle, clientName, dateKeyOf } from "../../services/orders";
import { Zap, CheckCircle2, Calendar, Package, Cake, Clock, ChefHat, ArrowRight } from "lucide-react";

interface Props {
  userName: string;
  onNavigate: (page: string) => void;
}

interface Task { id: string; cake: string; client: string; date: string; status: string; }

export default function EmployeeHome({ userName, onNavigate }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");

  // El backend ya devuelve solo los pedidos asignados a este empleado
  useEffect(() => {
    api<{ orders: any[] }>("/orders").then((r) => setOrders(r.orders)).catch((e) => setError(e.message));
  }, []);

  const today = new Date();
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);
  const sameDay = (iso: string) => dateKeyOf(iso) === dateKeyOf(today.toISOString());
  const live = orders.filter((o) => !isDeadStatus(o.status) && o.status !== "delivered");

  const MY_TASKS: Task[] = live.slice(0, 5).map((o) => ({
    id: orderCode(o), cake: orderTitle(o), client: clientName(o),
    date: new Date(o.deliveryDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    status: DB_TO_UI[o.status] || "pending",
  }));
  const statValues = {
    active: live.filter((o) => o.status === "in_preparation").length,
    doneToday: orders.filter((o) => (o.status === "ready" || o.status === "delivered") && sameDay(o.updatedAt)).length,
    week: orders.filter((o) => { const d = new Date(o.deliveryDate); return d >= startOfWeek && d < endOfWeek; }).length,
    upcoming: live.filter((o) => o.status === "pending" || o.status === "pending_quote").length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Hola, {userName.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">Aquí están tus tareas para hoy</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tareas activas", value: String(statValues.active), Icon: Zap, color: "from-pink-400 to-rose-400" },
          { label: "Completadas hoy", value: String(statValues.doneToday), Icon: CheckCircle2, color: "from-green-400 to-emerald-400" },
          { label: "Esta semana", value: String(statValues.week), Icon: Calendar, color: "from-purple-400 to-pink-400" },
          { label: "Próximas", value: String(statValues.upcoming), Icon: Package, color: "from-indigo-400 to-purple-400" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-4 text-center">
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mx-auto mb-2`}>
              <Icon size={18} className="text-white" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => onNavigate("my-tasks")}
          className="bg-card rounded-3xl card-shadow border border-border p-5 flex flex-col items-center gap-3 hover:scale-105 transition-transform">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Package size={22} className="text-indigo-400" />
          </div>
          <span className="font-bold text-foreground text-sm">Mis pedidos</span>
        </button>
        <button onClick={() => onNavigate("calendar")}
          className="bg-card rounded-3xl card-shadow border border-border p-5 flex flex-col items-center gap-3 hover:scale-105 transition-transform">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Calendar size={22} className="text-purple-400" />
          </div>
          <span className="font-bold text-foreground text-sm">Calendario</span>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Mis pedidos activos</h2>
          <button onClick={() => onNavigate("my-tasks")} className="flex items-center gap-1 text-sm text-indigo-500 font-bold hover:text-indigo-600">
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {MY_TASKS.length === 0 && <p className="text-sm text-muted-foreground">No tienes pedidos activos.</p>}
          {MY_TASKS.map((task) => (
            <div key={task.id} className="bg-card rounded-3xl card-shadow border border-border p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shrink-0">
                <Cake size={22} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">{task.cake}</div>
                <div className="text-xs text-muted-foreground">{task.id} · {task.client}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${task.status === "progress" ? "badge-progress" : "badge-pending"}`}>
                  {task.status === "progress" ? <ChefHat size={10} /> : <Clock size={10} />}
                  {task.status === "progress" ? "En proceso" : "Pendiente"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{task.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
