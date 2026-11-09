import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export const NOTIFICATIONS_CHANGED = "bakeflow:notifications-changed";

/** Cantidad de notificaciones sin leer del usuario; se refresca cada minuto y al leer/marcar. */
export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api<{ count: number }>("/notifications/unread-count").then((r) => setCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => { clearInterval(timer); window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); };
  }, [refresh]);

  return count;
}