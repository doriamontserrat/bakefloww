import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { TrendingUp, TrendingDown, Sparkles, Plus, X, DollarSign, Search, Filter } from "lucide-react";

interface Tx { id: string; type: "income" | "expense"; desc: string; amount: number; date: string; category: string; }

function toTx(r: any): Tx {
  return {
    id: r._id, type: r.type, desc: r.concept, amount: r.amount, category: r.category || "Otro",
    date: new Date(r.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
  };
}
export default function Finances() {
  const [showModal, setShowModal] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [form, setForm] = useState({ desc: "", amount: "", category: "Venta", date: "" });
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ records: any[] }>("/finances")
      .then(({ records }) => setTransactions(records.map(toTx)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  const allCategories = ["Venta", "Ingredientes", "Materiales", "Servicios", "Nómina", "Otro"];

  const filtered = transactions.filter((t) => {
    const matchType = filter === "all" || t.type === filter;
    const matchCat = catFilter === "all" || t.category === catFilter;
    const matchSearch = !search || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchType && matchCat && matchSearch;
  });

  async function save() {
    const amount = Number(form.amount);
    if (!form.desc.trim() || !(amount > 0)) { setError("Indica una descripción y un monto mayor a 0."); return; }
    setError("");
    setSaving(true);
    try {
      const { record } = await api<{ record: any }>("/finances", {
        method: "POST",
        body: { type: txType, concept: form.desc.trim(), amount, category: form.category, ...(form.date ? { date: form.date } : {}) },
      });
      setTransactions((prev) => [toTx(record), ...prev]);
      setShowModal(false);
      setForm({ desc: "", amount: "", category: "Venta", date: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Finanzas</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Historial de movimientos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all">
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="text-sm text-muted-foreground mb-4">Cargando movimientos...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-3xl card-shadow border border-border p-5">
          <div className="w-11 h-11 bg-pink-500 rounded-2xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div className="text-xs font-bold text-muted-foreground">Ingresos</div>
          <div className="font-display text-2xl font-bold text-pink-500 mt-1">${income.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-3xl card-shadow border border-border p-5">
          <div className="w-11 h-11 bg-violet-500 rounded-2xl flex items-center justify-center mb-3">
            <TrendingDown size={20} className="text-white" />
          </div>
          <div className="text-xs font-bold text-muted-foreground">Gastos</div>
          <div className="font-display text-2xl font-bold text-violet-500 mt-1">${expenses.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-3xl card-shadow border border-border p-5">
          <div className={`w-11 h-11 ${profit >= 0 ? "bg-indigo-500" : "bg-violet-400"} rounded-2xl flex items-center justify-center mb-3`}>
            {profit >= 0 ? <Sparkles size={20} className="text-white" /> : <TrendingDown size={20} className="text-white" />}
          </div>
          <div className="text-xs font-bold text-muted-foreground">Ganancia neta</div>
          <div className={`font-display text-2xl font-bold mt-1 ${profit >= 0 ? "text-foreground" : "text-violet-500"}`}>${profit.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
        <div className="p-5 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-lg font-semibold text-foreground">Movimientos</h2>
            <div className="flex gap-2 flex-wrap">
              {[["all", "Todos"], ["income", "Ingresos"], ["expense", "Gastos"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === val ? "bg-pink-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-40 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar movimiento..."
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-border bg-muted focus:outline-none focus:border-pink-400 text-xs font-medium" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted-foreground" />
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl border border-border bg-muted focus:outline-none focus:border-pink-400 text-xs font-medium">
                <option value="all">Todas las categorías</option>
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-pink-50" : "bg-violet-50"}`}>
                {tx.type === "income" ? <TrendingUp size={18} className="text-pink-500" /> : <TrendingDown size={18} className="text-violet-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">{tx.desc}</div>
                <div className="text-xs text-muted-foreground">{tx.category} · {tx.date}</div>
              </div>
              <span className={`font-display font-semibold ${tx.type === "income" ? "text-pink-500" : "text-violet-500"}`}>
                {tx.type === "income" ? "+" : "-"}${tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow-lg p-6 border border-border animate-pop">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <DollarSign size={20} className="text-pink-400" /> Registrar movimiento
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex bg-muted rounded-2xl p-1">
                <button onClick={() => setTxType("income")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-pink-500 text-white" : "text-muted-foreground"}`}>
                  <TrendingUp size={14} /> Ingreso
                </button>
                <button onClick={() => setTxType("expense")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-violet-500 text-white" : "text-muted-foreground"}`}>
                  <TrendingDown size={14} /> Gasto
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción</label>
                <input type="text" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Ej: Pedido #1046 - Cliente"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Monto ($)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Fecha</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Categoría</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium">
                  {["Venta", "Ingredientes", "Materiales", "Servicios", "Nómina", "Otro"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted">Cancelar</button>
                <button onClick={save} disabled={saving} className="disabled:opacity-60 flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md">Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
