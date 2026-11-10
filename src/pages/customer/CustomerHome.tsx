import { useState, useEffect } from "react";
import { Cake, Sparkles, Package, User, ArrowRight, ShoppingCart, Gift } from "lucide-react";
import { api } from "../../services/api";

interface Props {
  userName: string;
  onNavigate: (page: string) => void;
  /** Abre el menú solo con los productos de esa pastelería */
  onOpenBakery: (bakery: { id: string; name: string }) => void;
}

interface Popular { _id: string; name: string; price: number; imageUrl: string; bakeryId?: { name: string } }
interface BakeryCard { _id: string; name: string; address: string; logoUrl: string; description: string }
export default function CustomerHome({ userName, onNavigate, onOpenBakery }: Props) {
  const [popular, setPopular] = useState<Popular[]>([]);
  const [bakeries, setBakeries] = useState<BakeryCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<{ products: Popular[] }>("/products/popular?limit=3"), api<{ bakeries: BakeryCard[] }>("/bakeries")])
      .then(([p, b]) => { setPopular(p.products); setBakeries(b.bakeries); })
      .catch((e) => setError(e.message));
  }, []);

  const first = userName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 space-y-8">

      {/* ── HERO BANNER ─────────────────────────── */}
      <div className="relative bg-gradient-to-br from-pink-500 via-rose-400 to-violet-500 rounded-3xl overflow-hidden p-6 md:p-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-0 left-12 w-32 h-32 bg-violet-400/30 rounded-full translate-y-1/3" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-semibold">{greeting},</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mt-0.5">{first}!</h1>
            <p className="text-white/80 text-sm mt-2 font-medium">¿Qué delicia quieres ordenar hoy?</p>
          </div>
          <button onClick={() => onNavigate("menu")}
            className="shrink-0 flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl border border-white/30 transition-all text-sm backdrop-blur-sm">
            <ShoppingCart size={16} /> Ver menú
          </button>
        </div>
      </div>

      {/* ── QUICK ACTIONS ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { Icon: Cake,     label: "Ver menú",       page: "menu",         color: "bg-pink-500" },
          { Icon: Sparkles, label: "Pastel especial", page: "custom-order", color: "bg-violet-500" },
          { Icon: Package,  label: "Mis pedidos",     page: "my-orders",    color: "bg-indigo-500" },
          { Icon: User,     label: "Mi perfil",       page: "profile",      color: "bg-pink-400" },
        ].map(({ Icon, label, page, color }) => (
          <button key={page} onClick={() => onNavigate(page)}
            className="bg-card rounded-3xl card-shadow border border-border p-4 md:p-5 flex flex-col items-center gap-3 hover:scale-[1.03] hover:card-shadow-lg transition-all group">
            <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
              <Icon size={22} className="text-white" />
            </div>
            <span className="text-xs md:text-sm font-bold text-foreground text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {/* ── MÁS POPULARES ───────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Más populares</h2>
          <button onClick={() => onNavigate("menu")} className="flex items-center gap-1 text-sm text-pink-500 font-bold hover:text-pink-600 transition-colors">
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        {popular.length === 0 && !error && <p className="text-sm text-muted-foreground">Aún no hay productos en el menú.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {popular.map((cake) => (
            <div key={cake._id} className="bg-card rounded-3xl card-shadow border border-border overflow-hidden hover:scale-[1.02] transition-transform group">
              <div className="h-36 overflow-hidden bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center">
                {cake.imageUrl
                  ? <img src={cake.imageUrl} alt={cake.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <Cake size={40} className="text-pink-300" />}
              </div>
              <div className="p-4">
                <div className="font-bold text-sm text-foreground mb-1">{cake.name}</div>
                <div className="text-xs text-muted-foreground font-medium mb-3">{cake.bakeryId?.name}</div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-semibold text-pink-500">${cake.price}</span>
                  <button onClick={() => onNavigate("menu")}
                    className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1">
                    <ShoppingCart size={11} /> Ordenar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PASTELERÍAS ───────────────────── */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Pastelerías</h2>
        {bakeries.length === 0 && !error && <p className="text-sm text-muted-foreground">Aún no hay pastelerías disponibles.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bakeries.map((b) => (
            <button key={b._id} onClick={() => onOpenBakery({ id: b._id, name: b.name })}
              className="bg-card rounded-3xl card-shadow border border-border p-4 flex items-center gap-4 text-left hover:border-pink-200 transition-all">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shrink-0">
                {b.logoUrl ? <img src={b.logoUrl} alt={b.name} className="w-full h-full object-cover" /> : <Gift size={22} className="text-pink-400" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground truncate">{b.name}</div>
                <div className="text-xs text-muted-foreground truncate">{b.address || b.description || "Pastelería"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PASTEL A TU GUSTO ───────────────────── */}
      <div className="relative bg-gradient-to-br from-violet-500 via-violet-400 to-pink-400 rounded-3xl overflow-hidden p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <div className="text-white font-display text-xl font-bold leading-tight">Diseña tu pastel especial</div>
              <div className="text-white/80 text-sm font-medium">Cuéntanos tu idea y la pastelería te envía una cotización</div>
            </div>
          </div>
          <button onClick={() => onNavigate("custom-order")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-violet-600 font-bold rounded-2xl text-sm hover:bg-violet-50 transition-colors shadow-md">
            Pedir ahora <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}