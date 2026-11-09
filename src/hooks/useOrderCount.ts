import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export const ORDERS_CHANGED = "bakeflow:orders-changed";

/** Cantidad de pedidos que cumplen una consulta (p. ej. "type=custom&status=pending_quote"); se refresca sola. */
export function useOrderCount(query: string): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api<{ orders: unknown[] }>(`/orders?${query}`).then((r) => setCount(r.orders.length)).catch(() => {});
  }, [query]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener(ORDERS_CHANGED, refresh);
    return () => { clearInterval(timer); window.removeEventListener(ORDERS_CHANGED, refresh); };
  }, [refresh]);

  return count;
}