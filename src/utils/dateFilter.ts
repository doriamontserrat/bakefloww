// Filtro por fecha de entrega compartido por las pantallas de pedidos (pastelería y cliente).

export type DateFilter = "all" | "today" | "week" | "month" | "upcoming" | "past" | "custom";

export const DATE_FILTERS: { val: DateFilter; label: string }[] = [
  { val: "all", label: "Todas las fechas" }, { val: "today", label: "Hoy" }, { val: "week", label: "Esta semana" },
  { val: "month", label: "Este mes" }, { val: "upcoming", label: "Próximos" }, { val: "past", label: "Pasados" }, { val: "custom", label: "Elegir día" },
];

/** Clave local YYYY-MM-DD */
export const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function matchesDate(key: string, f: DateFilter, custom: string): boolean {
  const now = new Date();
  const today = keyOf(now);
  if (f === "all") return true;
  if (f === "today") return key === today;
  if (f === "upcoming") return key >= today;
  if (f === "past") return key < today;
  if (f === "custom") return !custom || key === custom;
  if (f === "month") return key.slice(0, 7) === today.slice(0, 7);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)); // lunes
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return key >= keyOf(start) && key <= keyOf(end);
}

/** Orden por fecha de entrega: próximos primero; en "Pasados", los más recientes primero. */
export const compareByDate = (f: DateFilter) => (a: { dateKey: string }, b: { dateKey: string }) =>
  f === "past" ? b.dateKey.localeCompare(a.dateKey) : a.dateKey.localeCompare(b.dateKey);
