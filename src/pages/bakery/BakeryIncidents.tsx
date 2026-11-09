import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { AlertTriangle, Plus, X, Clock, CheckCircle2, ShieldAlert, MessageSquare, Send } from "lucide-react";

type IncidentStatus = "open" | "in_review" | "resolved";
type IncidentType = "technical" | "payment" | "complaint" | "other";

interface Incident {
  id: string; dbId: string; type: IncidentType; title: string; desc: string;
  status: IncidentStatus; date: string; adminNote?: string;
}

const TYPE_META: Record<IncidentType, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  technical: { label: "Técnico",       Icon: ShieldAlert,    color: "bg-violet-50 text-violet-600 border-violet-100" },
  payment:   { label: "Pago",          Icon: AlertTriangle,  color: "bg-pink-50 text-pink-600 border-pink-100" },
  complaint: { label: "Queja/Cliente", Icon: MessageSquare,  color: "bg-rose-50 text-rose-600 border-rose-100" },
  other:     { label: "Otro",          Icon: AlertTriangle,  color: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100" },
};

const STATUS_UI: Record<IncidentStatus, { label: string; class: string; Icon: React.ComponentType<{ size?: number }> }> = {
  open:      { label: "Abierto",      class: "badge-pending",  Icon: Clock },
  in_review: { label: "En revisión",  class: "badge-progress", Icon: Clock },
  resolved:  { label: "Resuelto",     class: "badge-ready",    Icon: CheckCircle2 },
};

function toIncident(i: any): Incident {
  return {
    id: "INC-" + String(i._id).slice(-6).toUpperCase(), dbId: i._id, type: (TYPE_META[i.type as IncidentType] ? i.type : "other") as IncidentType,
    title: i.title, desc: i.description, status: i.status,
    date: new Date(i.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
    adminNote: i.adminResolution || undefined,
  };
}
const TYPE_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: "technical", label: "Problema técnico" },
  { value: "payment",   label: "Problema de pago" },
  { value: "complaint", label: "Queja de cliente" },
  { value: "other",     label: "Otro" },
];

export default function BakeryIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<{ type: IncidentType; title: string; desc: string }>({ type: "technical", title: "", desc: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<{ incidents: any[] }>("/incidents")
      .then(({ incidents }) => {
        const list = incidents.map(toIncident);
        setIncidents(list);
        setSelected(list[0]?.id ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sel = incidents.find(i => i.id === selected);

  async function submit() {
    if (!form.title.trim() || !form.desc.trim()) return;
    setSending(true);
    setError("");
    try {
      const { incident } = await api<{ incident: any }>("/incidents", {
        method: "POST", body: { type: form.type, title: form.title.trim(), description: form.desc.trim() },
      });
      const newInc = toIncident(incident);
      setIncidents(prev => [newInc, ...prev]);
      setSelected(newInc.id);
      setForm({ type: "technical", title: "", desc: "" });
      setShowNew(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la incidencia.");
    } finally {
      setSending(false);
    }
  }
  const openCount = incidents.filter(i => i.status === "open").length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
            <AlertTriangle size={26} className="text-pink-400" /> Incidencias
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Reporta problemas al equipo de BakeFlow · {openCount} abiert{openCount === 1 ? "o" : "os"}
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm shadow-sm hover:shadow-md transition-all active:scale-95">
          <Plus size={15} /> Reportar incidencia
        </button>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-4 text-sm text-muted-foreground">Cargando incidencias...</p>}
      {!loading && incidents.length === 0 && <p className="mb-4 text-sm text-muted-foreground">No has reportado incidencias.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* List */}
        <div className="lg:col-span-2 space-y-2.5">
          {incidents.map(inc => {
            const meta = TYPE_META[inc.type];
            const stat = STATUS_UI[inc.status];
            return (
              <button key={inc.id} onClick={() => setSelected(inc.id)}
                className={`w-full text-left p-4 rounded-3xl border-2 transition-all ${selected === inc.id ? "border-pink-400 bg-pink-50" : "border-border bg-card hover:border-pink-200 card-shadow"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}>
                    <meta.Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-xs text-pink-500">{inc.id}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${stat.class}`}>{stat.label}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground truncate">{inc.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{meta.label} · {inc.date}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {sel && (() => { const SelStatIcon = STATUS_UI[sel.status].Icon; return (
          <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-border p-5 md:p-6 h-fit animate-fade-up">
            <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm text-pink-500">{sel.id}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${TYPE_META[sel.type].color}`}>
                    {TYPE_META[sel.type].label}
                  </span>
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">{sel.title}</h2>
                <div className="text-xs text-muted-foreground mt-0.5">{sel.date}</div>
              </div>
              <span className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border ${STATUS_UI[sel.status].class}`}>
                <SelStatIcon size={10} /> {STATUS_UI[sel.status].label}
              </span>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-muted rounded-2xl p-4">
                <div className="text-xs font-bold text-muted-foreground mb-1.5">Descripción del problema</div>
                <p className="text-sm font-medium text-foreground leading-relaxed">{sel.desc}</p>
              </div>
              {sel.adminNote && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-700 mb-1.5">
                    <MessageSquare size={12} /> Respuesta de BakeFlow
                  </div>
                  <p className="text-sm text-violet-700 font-medium leading-relaxed">{sel.adminNote}</p>
                </div>
              )}
            </div>

            {sel.status === "open" && (
              <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 text-xs text-pink-700 font-medium flex items-center gap-2">
                <Clock size={12} /> Tu reporte fue recibido. El equipo de BakeFlow lo revisará pronto.
              </div>
            )}

            {sel.status === "resolved" && (
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 text-xs text-violet-700 font-bold flex items-center gap-2">
                <CheckCircle2 size={12} /> Este incidente fue resuelto por el equipo de BakeFlow.
              </div>
            )}
          </div>
        ); })()}
      </div>

      {/* New incident modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow-xl border border-border p-6 animate-pop">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold">Reportar incidencia</h2>
              <button onClick={() => setShowNew(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Tipo de incidencia</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                      className={`text-left px-3 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all ${form.type === opt.value ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Título</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Describe brevemente el problema" className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción detallada</label>
                <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  rows={3} placeholder="¿Qué ocurrió? ¿Cuándo? ¿Cómo afecta tu operación?"
                  className="input-base resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowNew(false)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted text-sm transition-colors">Cancelar</button>
                <button onClick={submit} disabled={sending || !form.title.trim() || !form.desc.trim()}
                  className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                  <Send size={13} /> Enviar reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
