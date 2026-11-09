import { useEffect, useState } from "react";
import { Package, Bell, Tag, AlertTriangle } from "lucide-react";
import { api } from "../services/api";
import { NOTIFICATIONS_CHANGED } from "../hooks/useUnreadNotifications";

interface Notif { _id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string; }

const ACCENT = {
  pink: { link: "text-pink-500 hover:text-pink-600", unread: "bg-pink-50 border-pink-200 card-shadow", icon: "text-pink-500", dot: "bg-pink-500" },
  indigo: { link: "text-indigo-500", unread: "bg-indigo-50 border-indigo-200 card-shadow", icon: "text-indigo-500", dot: "bg-indigo-500" },
};
const TYPE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  order: Package, promo: Tag, incident: AlertTriangle, system: Bell,
};

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Justo ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `Hace ${d} ${d === 1 ? "día" : "días"}`;
}

export default function NotificationList({ accent }: { accent: keyof typeof ACCENT }) {
  const c = ACCENT[accent];
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const unread = notifs.filter((n) => !n.isRead).length;

  useEffect(() => {
    api<{ notifications: Notif[] }>("/notifications")
      .then((r) => setNotifs(r.notifications))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(n: Notif) {
    if (n.isRead) return;
    setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    try {
      await api(`/notifications/${n._id}/read`, { method: "PATCH" });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (e) {
      setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: false } : x)));
      setError(e instanceof Error ? e.message : "No se pudo marcar como leída.");
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron marcar como leídas.");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Notificaciones</h1>
          {unread > 0 && <p className="text-muted-foreground text-sm mt-1 font-medium">{unread} sin leer</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className={`text-sm font-bold ${c.link}`}>Marcar todas como leídas</button>
        )}
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>}
      {!loading && !error && notifs.length === 0 && <p className="text-sm text-muted-foreground">No tienes notificaciones.</p>}

      <div className="space-y-3">
        {notifs.map((n) => {
          const Icon = TYPE_ICON[n.type] || Bell;
          return (
            <div key={n._id} onClick={() => markRead(n)}
              className={`flex items-start gap-4 p-4 rounded-3xl border cursor-pointer transition-all hover:scale-[1.01] ${!n.isRead ? c.unread : "bg-card border-border"}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!n.isRead ? "bg-white shadow-sm" : "bg-muted"}`}>
                <Icon size={20} className={!n.isRead ? c.icon : "text-muted-foreground"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.isRead && <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${c.dot}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}