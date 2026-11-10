import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Star, TrendingUp, DollarSign, CreditCard, Search, Filter, Store } from "lucide-react";

interface Txn { id: string; bakery: string; type: string; desc: string; amount: number; date: string; }

export default function AdminTransactions() {
  const [TRANSACTIONS, setTransactions] = useState<Txn[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ transactions: any[] }>("/admin/transactions")
      .then(({ transactions }) => {
        // 1. Ordenamos de más reciente a más antiguo (por fecha real)
        const sorted = [...transactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const seenSubs = new Set<string>();

        // 2. Filtramos para dejar solo 1 suscripción por pastelería al mes
        const deduplicated = sorted.filter((t) => {
          if (t.type === "subscription") {
            const dateObj = new Date(t.date);
            // Llave única: NombreTienda-Mes-Año (ej: Mondiu Paris-10-2026)
            const periodKey = `${t.bakery}-${dateObj.getMonth()}-${dateObj.getFullYear()}`;
            
            if (seenSubs.has(periodKey)) {
              return false; // Ya tenemos la suscripción más reciente de este mes, ignoramos esta
            }
            seenSubs.add(periodKey);
            return true;
          }
          return true; // Las comisiones (ventas) siempre pasan
        });

        // 3. Guardamos en el estado formateando la fecha
        setTransactions(
          deduplicated.map((t) => ({
            ...t,
            date: new Date(t.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [bakeryFilter, setBakeryFilter] = useState("all");
  const [tab, setTab] = useState<"list" | "report">("list");

  const BAKERIES = [...new Set(TRANSACTIONS.map((t) => t.bakery))];
  const total = TRANSACTIONS.reduce((s, t) => s + t.amount, 0);
  const subs = TRANSACTIONS.filter((t) => t.type === "subscription").reduce((s, t) => s + t.amount, 0);
  const commissions = TRANSACTIONS.filter((t) => t.type === "commission").reduce((s, t) => s + t.amount, 0);

  const filtered = TRANSACTIONS.filter((t) => {
    const matchSearch = !search || t.bakery.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchBakery = bakeryFilter === "all" || t.bakery === bakeryFilter;
    return matchSearch && matchType && matchBakery;
  });

  const bakeryReport = BAKERIES.map((name) => {
    const txs = TRANSACTIONS.filter((t) => t.bakery === name);
    return {
      name,
      count: txs.length,
      total: txs.reduce((s, t) => s + t.amount, 0),
      subs: txs.filter((t) => t.type === "subscription").reduce((s, t) => s + t.amount, 0),
      commissions: txs.filter((t) => t.type === "commission").reduce((s, t) => s + t.amount, 0),
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <CreditCard size={28} className="text-pink-400" /> Transacciones
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Movimientos registrados en la plataforma</p>
      </div>

      {error && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-5 text-sm text-muted-foreground">Cargando transacciones...</p>}
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total recaudado", value: `$${total.toLocaleString()}`, Icon: DollarSign, color: "bg-pink-500" },
          { label: "Suscripciones", value: `$${subs.toLocaleString()}`, Icon: Star, color: "bg-violet-500" },
          { label: "Comisiones", value: `$${commissions.toLocaleString()}`, Icon: TrendingUp, color: "bg-indigo-500" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-5">
            <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center mb-2`}>
              <Icon size={18} className="text-white" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[["list", "Transacciones"], ["report", "Reporte por tienda"]].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val as "list" | "report")}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${tab === val ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-48 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID, tienda o descripción..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted-foreground" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium">
                <option value="all">Todos los tipos</option>
                <option value="subscription">Suscripción</option>
                <option value="commission">Comisión</option>
              </select>
            </div>
            <select value={bakeryFilter} onChange={(e) => setBakeryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium">
              <option value="all">Todas las tiendas</option>
              {BAKERIES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
            <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
              <span>ID</span><span className="col-span-2">Pastelería / Descripción</span><span>Tipo</span><span>Fecha</span><span>Monto</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">Sin resultados</div>
              ) : filtered.map((t) => (
                <div key={t.id} className="grid grid-cols-6 gap-3 px-5 py-4 items-center">
                  <span className="text-xs font-bold text-muted-foreground">{t.id}</span>
                  <div className="col-span-2">
                    <div className="font-bold text-sm text-foreground">{t.bakery}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${t.type === "subscription" ? "bg-purple-50 text-purple-700" : "bg-pink-50 text-pink-700"}`}>
                    {t.type === "subscription" ? <><Star size={9} /> Suscripción</> : <><TrendingUp size={9} /> Comisión</>}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{t.date}</span>
                  <span className={`font-display font-semibold ${t.amount > 0 ? "text-pink-500" : "text-muted-foreground"}`}>
                    {t.amount > 0 ? `+$${t.amount.toLocaleString()}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "report" && (
        <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
          <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
            <span className="col-span-2">Pastelería</span><span>Transacciones</span><span>Suscripción</span><span>Comisiones</span><span>Total</span>
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
                <span className="text-sm font-semibold text-foreground">{b.count}</span>
                <span className="text-sm font-semibold text-violet-600">{b.subs > 0 ? `$${b.subs}` : "—"}</span>
                <span className="text-sm font-semibold text-indigo-600">{b.commissions > 0 ? `$${b.commissions}` : "—"}</span>
                <span className="font-display font-bold text-pink-500">${b.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-muted border-t border-border flex justify-end gap-8 text-sm font-bold">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground">${total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}