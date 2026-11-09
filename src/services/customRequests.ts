// Solicitudes de pasteles personalizados: se guardan como pedidos (orderType "custom") en el backend.
import { orderCode, fmtDate } from "./orders";

export type CustomRequestStatus = "pending" | "awaiting_client" | "confirmed" | "rejected" | "declined";

export interface CustomRequest {
  id: string;          // código corto para mostrar (#A1B2C3)
  dbId: string;        // _id real, para las llamadas a la API
  status: CustomRequestStatus;
  client: string;
  bakery: string;
  theme: string;
  size: string;
  flavor: string;
  frosting: string;
  decorations: string;
  message: string;
  date: string;
  persons: string;
  budget: string;
  notes: string;
  refImage: string;
  bakeryNote: string;
  quotedPrice?: number;
}

/** Estado del pedido en el backend -> estado que muestran las pantallas de solicitudes. */
const STATUS_FROM_DB: Record<string, CustomRequestStatus> = {
  pending_quote: "pending", awaiting_client: "awaiting_client", rejected: "rejected", declined: "declined",
  cancelled: "rejected", // cualquier otro estado (pending, in_preparation, ready, delivered) = confirmado
};

export function toCustomRequest(o: any): CustomRequest {
  const d = o.customDetails || {};
  return {
    id: orderCode(o), dbId: o._id,
    status: STATUS_FROM_DB[o.status] || "confirmed",
    client: o.customerId?.name || "Cliente", bakery: o.bakeryId?.name || "",
    theme: d.theme || "Pastel personalizado", size: d.size || "", flavor: d.flavor || "", frosting: d.frosting || "",
    decorations: d.decorations || "", message: d.message || "", persons: d.persons || "", budget: d.budget || "",
    notes: d.specialInstructions || "", refImage: d.referenceImageUrl || "", bakeryNote: d.bakeryNote || "",
    date: fmtDate(o.deliveryDate),
    quotedPrice: d.quotedPrice > 0 ? d.quotedPrice : undefined,
  };
}