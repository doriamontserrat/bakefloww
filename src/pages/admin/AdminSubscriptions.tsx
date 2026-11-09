import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { CheckCircle2, Star, Crown, Flower2, DollarSign } from "lucide-react";

interface SubRow { bakery: string; plan: string; status: string; end: string; amount: string; price: number; }

const PLAN_LABEL: Record<string, string> = { basic: "Gratuito", pro: "Pro", enterprise: "Premium" };

function toRow(b: any): SubRow {
  const s = b.subscription || {};
  const price = s.price || 0;
  return {
    bakery: b.name, plan: PLAN_LABEL[s.plan] || "Gratuito", status: s.status || "active", price,
    end: s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "-",
    amount: `$${price}`,
  };
}
const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Activa", class: "badge-ready" },
  cancelled: { label: "Cancelada", class: "badge-cancelled" },
  expired: { label: "Vencida", class: "badge-pending" },
};

const PLAN_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Gratuito: Flower2, Pro: Star, Premium: Crown,
};

export default function AdminSubscriptions() {
  const [SUBS, setSubs] = useState<SubRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ bakeries: any[] }>("/bakeries?all=true")
      .then(({ bakeries }) => setSubs(bakeries.map(toRow)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const active = SUBS.filter((s) => s.status === "active").length;
  const pro = SUBS.filter((s) => s.plan === "Pro" && s.status === "active").length;
  const premium = SUBS.filter((s) => s.plan === "Premium" && s.status === "active").length;
  const mrr = SUBS.filter((s) => s.status === "active").reduce((sum, s) => sum + s.price, 0);
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Suscripciones</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Estado de los planes de todas las pastelerías</p>
      </div>

      {error && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-5 text-sm text-muted-foreground">Cargando suscripciones...</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Activas", value: active, Icon: CheckCircle2, color: "bg-pink-500" },
          { label: "Plan Pro", value: pro, Icon: Star, color: "bg-violet-500" },
          { label: "Plan Premium", value: premium, Icon: Crown, color: "bg-amber-400" },
          { label: "MRR", value: `$${mrr.toLocaleString()}`, Icon: DollarSign, color: "bg-indigo-500" },
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

      <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
        <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
          <span className="col-span-2">Pastelería</span><span>Plan</span><span>Estado</span><span>Vence</span><span>Monto</span>
        </div>
        <div className="divide-y divide-border">
          {SUBS.map((s, i) => {
            const PlanIcon = PLAN_ICON[s.plan];
            return (
              <div key={i} className="grid grid-cols-6 gap-3 px-5 py-4 items-center">
                <div className="col-span-2 font-bold text-sm text-foreground">{s.bakery}</div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${s.plan === "Premium" ? "bg-amber-50 text-amber-700" : s.plan === "Pro" ? "bg-purple-50 text-purple-700" : "bg-muted text-muted-foreground"}`}>
                  <PlanIcon size={10} /> {s.plan}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_MAP[s.status].class}`}>
                  {STATUS_MAP[s.status].label}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{s.end}</span>
                <span className="font-display font-semibold text-sm text-foreground">{s.amount}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
