import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { AlertTriangle, ShieldAlert, MessageSquare, CheckCircle2, Search, BarChart2, Store } from "lucide-react";

interface IncidentRow { id: string; dbId: string; type: string; title: string; reporter: string; bakery: string; status: string; date: string; desc: string; }

// Estado del backend (in_review) <-> estado que muestra la pantalla (investigating)
const toUiStatus = (s: string) => (s === "in_review" ? "investigating" : s);
const toDbStatus = (s: string) => (s === "investigating" ? "in_review" : s);

function toRow(i: any): IncidentRow {
  return {
    id: "INC-" + String(i._id).slice(-6).toUpperCase(), dbId: i._id, type: i.type || "report", title: i.title,
    reporter: i.reportedBy?.name || "Sistema", bakery: i.bakeryId?.name || "—", status: toUiStatus(i.status),
    date: new Date(i.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }), desc: i.description,
  };
}
const TYPE_META: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number }> }> = {
  report: { label: "Reporte", class: "bg-pink-50 text-pink-700", Icon: AlertTriangle },
  fraud: { label: "Fraude", class: "bg-rose-50 text-rose-700", Icon: ShieldAlert },
  complaint: { label: "Queja", class: "bg-violet-50 text-violet-700", Icon: MessageSquare },
  technical: { label: "Técnico", class: "bg-indigo-50 text-indigo-700", Icon: ShieldAlert },
  payment: { label: "Pago", class: "bg-pink-50 text-pink-700", Icon: AlertTriangle },
  other: { label: "Otro", class: "bg-muted text-muted-foreground", Icon: MessageSquare },
};

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  open: { label: "Abierta", class: "badge-pending" },
  investigating: { label: "Investigando", class: "badge-progress" },
  resolved: { label: "Resuelta", class: "badge-ready" },
};


export default function AdminIncidents() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<"list" | "report">("list");
  const [reportSearch, setReportSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ incidents: any[] }>("/incidents")
      .then(({ incidents }) => {
        const rows = incidents.map(toRow);
        setIncidents(rows);
        setSelected(rows[0]?.id ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sel = incidents.find((i) => i.id === selected) ?? incidents[0];
  const SelTypeIcon = sel ? (TYPE_META[sel.type] ?? TYPE_META.report).Icon : AlertTriangle;
  const BAKERY_NAMES = [...new Set(incidents.map((i) => i.bakery))];

  async function setStatus(row: IncidentRow, status: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/incidents/${row.dbId}`, { method: "PUT", body: { status: toDbStatus(status) } });
      setIncidents((prev) => prev.map((i) => i.id === row.id ? { ...i, status } : i));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la incidencia.");
    } finally {
      setBusy(false);
    }
  }
  const bakeryReport = BAKERY_NAMES.map((name) => {
    const inc = incidents.filter((i) => i.bakery === name);
    return {
      name,
      total: inc.length,
      open: inc.filter((i) => i.status === "open").length,
      investigating: inc.filter((i) => i.status === "investigating").length,
      resolved: inc.filter((i) => i.status === "resolved").length,
    };
  }).sort((a, b) => b.total - a.total)
    .filter((b) => !reportSearch || b.name.toLowerCase().includes(reportSearch.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <AlertTriangle size={28} className="text-pink-400" /> Incidencias
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">{incidents.filter((i) => i.status === "open").length} abiertas</p>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[["list", "Incidencias"], ["report", "Reporte por tienda"]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val as "list" | "report")}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${tab === val ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "report" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total incidencias", value: incidents.length, color: "bg-pink-500" },
              { label: "Abiertas", value: incidents.filter((i) => i.status === "open").length, color: "bg-rose-400" },
              { label: "Resueltas", value: incidents.filter((i) => i.status === "resolved").length, color: "bg-violet-500" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-3xl card-shadow border border-border p-5">
                <div className={`w-10 h-10 ${s.color} rounded-2xl flex items-center justify-center mb-2`}>
                  <BarChart2 size={18} className="text-white" />
                </div>
                <div className="font-display text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={reportSearch} onChange={(e) => setReportSearch(e.target.value)}
              placeholder="Buscar pastelería..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium" />
          </div>
          <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
            <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
              <span className="col-span-2">Pastelería</span><span>Total</span><span>Abiertas</span><span>Investigando</span><span>Resueltas</span>
            </div>
            <div className="divide-y divide-border">
              {bakeryReport.map((b) => (
                <div key={b.name} className="grid grid-cols-6 gap-3 px-5 py-4 items-center">
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-50 rounded-xl flex items-center justify-center shrink-0">
                      <Store size={14} className="text-pink-400" />
                    </div>
                    <span className="font-bold text-sm text-foreground">{b.name}</span>
                  </div>
                  <span className="font-bold text-foreground">{b.total}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${b.open > 0 ? "badge-pending" : "bg-muted text-muted-foreground"}`}>{b.open}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${b.investigating > 0 ? "badge-progress" : "bg-muted text-muted-foreground"}`}>{b.investigating}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${b.resolved > 0 ? "badge-ready" : "bg-muted text-muted-foreground"}`}>{b.resolved}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "list" && (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {incidents.map((inc) => {
            const meta = TYPE_META[inc.type] ?? TYPE_META.report;
            return (
              <button key={inc.id} onClick={() => setSelected(inc.id)}
                className={`w-full text-left p-4 rounded-3xl border-2 transition-all ${selected === inc.id ? "border-pink-400 bg-pink-50" : "border-border bg-card hover:border-pink-200 card-shadow"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.class}`}>
                    <meta.Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-pink-500">{inc.id}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[inc.status].class}`}>{STATUS_MAP[inc.status].label}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground">{inc.title}</div>
                    <div className="text-xs text-muted-foreground">{inc.bakery} · {inc.date}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {sel ? (
        <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-border p-6 h-fit">
          <div className="flex items-center justify-between mb-5 pb-5 border-b border-border">
            <div>
                  <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">{sel.title}</h2>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${(TYPE_META[sel.type] ?? TYPE_META.report).class}`}>
                  <SelTypeIcon size={10} /> {(TYPE_META[sel.type] ?? TYPE_META.report).label}
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">{sel.id} · {sel.date}</div>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_MAP[sel.status].class}`}>{STATUS_MAP[sel.status].label}</span>
          </div>

          <div className="space-y-3 mb-5">
            {[
              { label: "Reportado por", value: sel.reporter },
              { label: "Pastelería involucrada", value: sel.bakery },
            ].map((f) => (
              <div key={f.label} className="bg-muted rounded-2xl p-3">
                <div className="text-xs text-muted-foreground font-semibold">{f.label}</div>
                <div className="font-bold text-sm text-foreground mt-0.5">{f.value}</div>
              </div>
            ))}
            <div className="bg-muted rounded-2xl p-3">
              <div className="text-xs text-muted-foreground font-semibold mb-1">Descripción</div>
              <div className="text-sm font-medium text-foreground leading-relaxed">{sel.desc}</div>
            </div>
          </div>

          {sel.status !== "resolved" && (
            <div className="flex gap-3">
              {sel.status === "open" && (
                <button onClick={() => setStatus(sel, "investigating")} disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-50 text-violet-600 border border-violet-200 font-bold rounded-2xl text-sm hover:bg-violet-100 transition-colors">
                  <Search size={14} /> Investigar
                </button>
              )}
              <button onClick={() => setStatus(sel, "resolved")} disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-pink-50 text-pink-600 border border-pink-200 font-bold rounded-2xl text-sm hover:bg-pink-100 transition-colors">
                <CheckCircle2 size={14} /> Resolver
              </button>
            </div>
          )}
        </div>
        ) : (
          <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {loading ? "Cargando incidencias..." : "No hay incidencias registradas."}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
