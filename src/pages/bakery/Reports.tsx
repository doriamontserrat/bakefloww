import { useEffect, useState } from "react";
import { BarChart2, Download, FileText, Lock, Crown, Star, TrendingUp } from "lucide-react";
import { api, getToken, hasFeature, getPlan } from "../../services/api";
import { API_URL } from "../authService";

interface Summary { monthOrders: number; monthSales: number; pending: number; byStatus: Record<string, number>; }
interface Sales {
  months: { key: string; orders: number; sales: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  payments: { method: string; orders: number; total: number }[];
}
interface Advanced {
  kpis: { totalOrders: number; soldOrders: number; revenue: number; averageTicket: number; cancellationRate: number; platformCommission: number; netRevenue: number };
  topCustomers: { name: string; orders: number; total: number }[];
  byWeekday: { day: string; orders: number }[];
  byType: { type: string; orders: number; total: number }[];
}

const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
const STATUS_LABEL: Record<string, string> = {
  pending_quote: "Cotización pendiente", awaiting_client: "Esperando cliente", pending: "Pendiente", in_preparation: "En proceso",
  ready: "Listo", delivered: "Entregado", cancelled: "Cancelado", rejected: "Rechazado", declined: "Declinado",
};
const PAY_LABEL: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", pending: "Por cobrar" };
const monthLabel = (key: string) => new Date(`${key}-01T12:00:00`).toLocaleDateString("es-MX", { month: "short" });
const escapeHtml = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function Locked({ title, plan }: { title: string; plan: "Pro" | "Premium" }) {
  const Icon = plan === "Premium" ? Crown : Star;
  return (
    <div className="bg-muted/60 border-2 border-dashed border-border rounded-3xl p-6 text-center">
      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Lock size={20} className="text-white" />
      </div>
      <div className="font-bold text-foreground">{title}</div>
      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center justify-center gap-1">
        <Icon size={12} /> Disponible desde el plan {plan}. Mejora tu plan en "Mi plan".
      </p>
    </div>
  );
}

function Bars({ data }: { data: { label: string; value: number; text: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-xs font-semibold">
          <span className="w-24 shrink-0 text-muted-foreground truncate">{d.label}</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-20 text-right text-foreground">{d.text}</span>
        </div>
      ))}
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-3xl card-shadow border border-border p-5">
    <h3 className="font-bold text-sm text-foreground mb-4">{title}</h3>
    {children}
  </div>
);

export default function Reports({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const canSales = hasFeature("stats");
  const canAdvanced = hasFeature("advancedReports");
  const canExport = hasFeature("export");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales] = useState<Sales | null>(null);
  const [advanced, setAdvanced] = useState<Advanced | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api<{ summary: Summary }>("/reports/summary").then((r) => setSummary(r.summary)).catch((e) => setError(e.message));
    if (canSales) api<Sales>("/reports/sales").then(setSales).catch((e) => setError(e.message));
    if (canAdvanced) api<Advanced>("/reports/advanced").then(setAdvanced).catch((e) => setError(e.message));
  }, [canSales, canAdvanced]);

  const query = (type: string, extra = "") =>
    `/reports/export?type=${type}${range.from ? `&from=${range.from}` : ""}${range.to ? `&to=${range.to}` : ""}${extra}`;

  // CSV: se pide con el token y se descarga como archivo
  async function exportCsv(type: "finances" | "transactions") {
    setBusy(`${type}-csv`); setError("");
    try {
      const res = await fetch(`${API_URL}${query(type, "&format=csv")}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "No se pudo exportar el reporte.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo exportar el reporte.");
    } finally { setBusy(""); }
  }

  // PDF: abre una vista imprimible; en el diálogo de impresión se elige "Guardar como PDF"
  async function exportPdf(type: "finances" | "transactions") {
    setBusy(`${type}-pdf`); setError("");
    const win = window.open("", "_blank");
    try {
      const data = await api<{ title: string; header: string[]; rows: unknown[][] }>(query(type));
      if (!win) throw new Error("Tu navegador bloqueó la ventana. Permite las ventanas emergentes e inténtalo de nuevo.");
      win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{font-size:20px;margin:0 0 4px}p{color:#666;font-size:12px;margin:0 0 16px}
        table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#fce7f3}</style></head><body>
        <h1>${escapeHtml(data.title)}</h1><p>Generado el ${new Date().toLocaleDateString("es-MX")} · ${data.rows.length} registros</p>
        <table><thead><tr>${data.header.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${data.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
        <script>window.onload=function(){window.print()}<\/script></body></html>`);
      win.document.close();
    } catch (e) {
      win?.close();
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    } finally { setBusy(""); }
  }

  const planName = getPlan()?.name || "Gratuito";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2"><BarChart2 size={26} className="text-pink-400" /> Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Tu plan actual: <span className="font-bold text-purple-600">{planName}</span></p>
      </div>

      {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {/* Básico: todos los planes */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Pedidos del mes", value: summary ? String(summary.monthOrders) : "…" },
          { label: "Ventas del mes", value: summary ? money(summary.monthSales) : "…" },
          { label: "Pendientes de aprobar", value: summary ? String(summary.pending) : "…" },
        ].map((k) => (
          <div key={k.label} className="bg-card rounded-3xl card-shadow border border-border p-5">
            <div className="text-xs text-muted-foreground font-semibold">{k.label}</div>
            <div className="font-display text-2xl font-semibold text-foreground mt-1">{k.value}</div>
          </div>
        ))}
      </section>
      {summary && Object.keys(summary.byStatus).length > 0 && (
        <Card title="Pedidos del mes por estado">
          <Bars data={Object.entries(summary.byStatus).map(([s, n]) => ({ label: STATUS_LABEL[s] || s, value: n, text: String(n) }))} />
        </Card>
      )}

      {/* Pro: ventas */}
      <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2"><TrendingUp size={18} className="text-pink-400" /> Ventas <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Pro</span></h2>
      {!canSales ? <Locked title="Reporte de ventas por mes, producto y método de pago" plan="Pro" /> : sales && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Ventas de los últimos 6 meses">
            <Bars data={sales.months.map((m) => ({ label: monthLabel(m.key), value: m.sales, text: money(m.sales) }))} />
          </Card>
          <Card title="Productos más vendidos">
            {sales.topProducts.length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay ventas.</p>
              : <Bars data={sales.topProducts.map((p) => ({ label: p.name, value: p.units, text: `${p.units} uds` }))} />}
          </Card>
          <Card title="Métodos de pago">
            {sales.payments.length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay ventas.</p>
              : <Bars data={sales.payments.map((p) => ({ label: PAY_LABEL[p.method] || p.method, value: p.total, text: money(p.total) }))} />}
          </Card>
        </div>
      )}

      {/* Premium: avanzados */}
      <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2"><Crown size={18} className="text-amber-500" /> Reportes avanzados <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Premium</span></h2>
      {!canAdvanced ? <Locked title="Ticket promedio, mejores clientes, cancelaciones y comisiones" plan="Premium" /> : advanced && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Ticket promedio", value: money(advanced.kpis.averageTicket) },
              { label: "Tasa de cancelación", value: `${advanced.kpis.cancellationRate}%` },
              { label: "Comisión plataforma", value: money(advanced.kpis.platformCommission) },
              { label: "Ingreso neto", value: money(advanced.kpis.netRevenue) },
            ].map((k) => (
              <div key={k.label} className="bg-card rounded-3xl card-shadow border border-border p-5">
                <div className="text-xs text-muted-foreground font-semibold">{k.label}</div>
                <div className="font-display text-xl font-semibold text-foreground mt-1">{k.value}</div>
              </div>
            ))}
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Mejores clientes">
              {advanced.topCustomers.length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay clientes con ventas.</p>
                : <Bars data={advanced.topCustomers.map((c) => ({ label: c.name, value: c.total, text: money(c.total) }))} />}
            </Card>
            <Card title="Pedidos por día de entrega">
              <Bars data={advanced.byWeekday.map((d) => ({ label: d.day, value: d.orders, text: String(d.orders) }))} />
            </Card>
          </div>
        </>
      )}

      {/* Exportar: Pro */}
      <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2"><Download size={18} className="text-pink-400" /> Exportar <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Pro</span></h2>
      {!canExport ? <Locked title="Exportar finanzas y transacciones a CSV y PDF" plan="Pro" /> : (
        <Card title="Finanzas y transacciones">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <label className="text-xs font-bold text-muted-foreground">Desde
              <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })}
                className="block mt-1 px-3 py-2 rounded-xl border-2 border-border bg-muted text-sm font-medium focus:outline-none focus:border-pink-400" /></label>
            <label className="text-xs font-bold text-muted-foreground">Hasta
              <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })}
                className="block mt-1 px-3 py-2 rounded-xl border-2 border-border bg-muted text-sm font-medium focus:outline-none focus:border-pink-400" /></label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["finances", "transactions"] as const).map((t) => (
              <div key={t} className="bg-muted rounded-2xl p-4">
                <div className="font-bold text-sm text-foreground mb-3">{t === "finances" ? "Finanzas (ingresos y gastos)" : "Transacciones (pedidos)"}</div>
                <div className="flex gap-2">
                  <button onClick={() => exportCsv(t)} disabled={!!busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-xs disabled:opacity-60">
                    <Download size={13} /> {busy === `${t}-csv` ? "Generando..." : "CSV"}
                  </button>
                  <button onClick={() => exportPdf(t)} disabled={!!busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-pink-400 text-pink-500 font-bold rounded-xl text-xs disabled:opacity-60">
                    <FileText size={13} /> {busy === `${t}-pdf` ? "Generando..." : "PDF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(!canSales || !canAdvanced || !canExport) && onNavigate && (
        <div className="text-center">
          <button onClick={() => onNavigate("subscription")}
            className="px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95">
            Mejorar mi plan
          </button>
        </div>
      )}
    </div>
  );
}
