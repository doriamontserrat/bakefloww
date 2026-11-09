import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Search, Store, MapPin, X, Trash2, Play, Pause, Lock, AlertTriangle } from "lucide-react";

interface BakeryRow { id: string; name: string; owner: string; email: string; location: string; plan: string; status: string; orders: number; date: string; }

const PLAN_LABEL: Record<string, string> = { basic: "Gratuito", pro: "Pro", enterprise: "Premium" };

function toRow(b: any): BakeryRow {
  return {
    id: b._id, name: b.name, owner: b.ownerId?.name || "—", email: b.ownerId?.email || "—", location: b.address || "—",
    plan: PLAN_LABEL[b.subscription?.plan] || "Gratuito", status: b.status, orders: b.ordersCount || 0,
    date: new Date(b.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
  };
}
export default function AdminBakeries() {
  const [bakeries, setBakeries] = useState<BakeryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api<{ bakeries: any[] }>("/bakeries?all=true")
      .then(({ bakeries }) => setBakeries(bakeries.map(toRow)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<BakeryRow | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCredentials, setDeleteCredentials] = useState({ user: "", password: "" });
  const [deleteError, setDeleteError] = useState("");

  const filtered = bakeries.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.owner.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || b.status === filter || b.plan.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  // Suspender una pastelería le impide recibir pedidos nuevos
  async function toggleStatus(id: string) {
    const bakery = bakeries.find((b) => b.id === id);
    if (!bakery) return;
    const status = bakery.status === "active" ? "suspended" : "active";
    setError("");
    try {
      await api(`/bakeries/${id}`, { method: "PUT", body: { status } });
      setBakeries((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
      setSelected((prev) => prev ? { ...prev, status } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    }
  }
  function openDeleteModal() {
    setDeleteCredentials({ user: "", password: "" });
    setDeleteError("");
    setShowDeleteModal(true);
  }

  // Reconfirma la identidad del admin en el servidor antes de borrar (elimina también menú y empleados)
  async function confirmDelete() {
    if (!selected) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api("/users/verify-credentials", { method: "POST", body: { email: deleteCredentials.user, password: deleteCredentials.password } });
      await api(`/bakeries/${selected.id}`, { method: "DELETE" });
      setBakeries((prev) => prev.filter((b) => b.id !== selected.id));
      setSelected(null);
      setShowDeleteModal(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar la pastelería.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <Store size={28} className="text-pink-400" /> Pastelerías
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">{bakeries.length} empresas registradas</p>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-4 text-sm text-muted-foreground">Cargando pastelerías...</p>}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pastelería..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[["all", "Todas"], ["active", "Activas"], ["suspended", "Suspendidas"], ["pro", "Pro"], ["premium", "Premium"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all ${filter === val ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card rounded-3xl card-shadow border border-border overflow-hidden">
          <div className="grid grid-cols-5 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
            <span className="col-span-2">Pastelería</span><span>Plan</span><span>Estado</span><span>Pedidos</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((b) => (
              <button key={b.id} onClick={() => setSelected(b)}
                className={`w-full grid grid-cols-5 gap-3 px-5 py-4 items-center text-left transition-all ${selected?.id === b.id ? "bg-pink-50" : "hover:bg-muted"}`}>
                <div className="col-span-2">
                  <div className="font-bold text-sm text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.owner}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${b.plan === "Premium" ? "bg-amber-50 text-amber-700" : b.plan === "Pro" ? "bg-purple-50 text-purple-700" : "bg-muted text-muted-foreground"}`}>
                  {b.plan}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${b.status === "active" ? "badge-ready" : "badge-cancelled"}`}>
                  {b.status === "active" ? "Activa" : "Suspendida"}
                </span>
                <span className="text-sm font-semibold text-foreground">{b.orders}</span>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="lg:col-span-2 bg-card rounded-3xl card-shadow border border-border p-5 h-fit">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">{selected.name}</h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <MapPin size={12} className="text-pink-400" /> {selected.location}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 mb-5">
              {[
                { label: "Propietaria", value: selected.owner },
                { label: "Email", value: selected.email },
                { label: "Plan", value: selected.plan },
                { label: "Pedidos totales", value: String(selected.orders) },
                { label: "Registro", value: selected.date },
              ].map((f) => (
                <div key={f.label} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs font-bold text-muted-foreground">{f.label}</span>
                  <span className="text-xs font-semibold text-foreground">{f.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <button onClick={() => toggleStatus(selected.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  selected.status === "active"
                    ? "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                    : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                }`}>
                {selected.status === "active" ? <><Pause size={14} /> Suspender</> : <><Play size={14} /> Reactivar</>}
              </button>
              <button onClick={openDeleteModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all">
                <Trash2 size={14} /> Eliminar cuenta
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-card rounded-3xl card-shadow border border-dashed border-border p-5 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Store size={32} className="mx-auto mb-2 text-pink-200" />
              <div className="text-sm font-medium">Selecciona una pastelería</div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl card-shadow-xl w-full max-w-sm p-6 border border-border animate-pop">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Eliminar pastelería</h2>
                <p className="text-xs text-muted-foreground font-medium">Acción irreversible</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Para eliminar <span className="font-bold text-foreground">{selected.name}</span>, ingresa tus credenciales de administrador.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">Correo del administrador</label>
                <input type="email" value={deleteCredentials.user} onChange={(e) => setDeleteCredentials((p) => ({ ...p, user: e.target.value }))}
                  placeholder="admin@correo.com" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <Lock size={11} className="text-muted-foreground" /> Contraseña
                </label>
                <input type="password" value={deleteCredentials.password} onChange={(e) => setDeleteCredentials((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl">{deleteError}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted text-sm">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="disabled:opacity-60 flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-sm transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
