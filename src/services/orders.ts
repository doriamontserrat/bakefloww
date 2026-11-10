// Utilidades compartidas para mostrar pedidos del backend en las pantallas.

/** Estados que manejan las pantallas de pedidos (calendarios, tareas, inicio). */
export type UiStatus = "pending" | "progress" | "prepared" | "ready" | "delivered" | "cancelled";

export const DB_TO_UI: Record<string, UiStatus> = {
  pending_quote: "pending", awaiting_client: "pending", pending: "pending", in_preparation: "progress",
  prepared: "prepared", ready: "ready", delivered: "delivered", cancelled: "cancelled", rejected: "cancelled", declined: "cancelled",
};

/** Estados en los que el pedido ya no se trabaja (cancelado o solicitud rechazada). */
export const isDeadStatus = (s: string): boolean => s === "cancelled" || s === "rejected" || s === "declined";
export const UI_TO_DB: Record<UiStatus, string> = {
  pending: "pending", progress: "in_preparation", prepared: "prepared", ready: "ready", delivered: "delivered", cancelled: "cancelled",
};
export const UI_LABEL: Record<UiStatus, string> = {
  pending: "Pendiente", progress: "En proceso", prepared: "Preparado (por revisar)", ready: "Listo", delivered: "Entregado", cancelled: "Cancelado",
};

export const orderCode = (o: any): string => "#" + String(o._id).slice(-6).toUpperCase();

export function orderTitle(o: any): string {
  if (o.orderType === "custom") return "Pastel personalizado";
  return (o.items || []).map((i: any) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name)).join(", ") || "Pedido";
}

/** Clave local YYYY-MM-DD de la fecha de entrega (para agrupar en calendarios). */
export function dateKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

export const clientName = (o: any): string => o.customerId?.name || "Cliente de mostrador";