import { useState, useEffect } from "react";
import { Star, Crown, Flower2, Check, X, Zap } from "lucide-react";
import { api, getStoredUser } from "../../services/api";

// Presentación de cada plan (clave del backend). Nombre, precio y límites vienen del servidor.
const STYLE: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; color: string; headerText: string; popular?: boolean; features: { text: string; included: boolean }[] }> = {
  basic: { Icon: Flower2, color: "from-pink-200 to-rose-200", headerText: "text-pink-700", features: [
    { text: "Calendario de pedidos", included: true },
    { text: "Gestión de clientes", included: true },
    { text: "Gestión básica de pedidos", included: true },
    { text: "Control financiero", included: false },
    { text: "Estadísticas", included: false },
    { text: "Pedidos ilimitados", included: false },
    { text: "Reportes avanzados", included: false },
  ] },
  pro: { Icon: Star, color: "from-purple-400 to-pink-400", headerText: "text-white", popular: true, features: [
    { text: "Pedidos ilimitados", included: true },
    { text: "Calendario de pedidos", included: true },
    { text: "Control financiero", included: true },
    { text: "Estadísticas", included: true },
    { text: "Gestión de clientes", included: true },
    { text: "Diseños y personalizados", included: true },
    { text: "Reportes avanzados", included: false },
    { text: "Automatizaciones", included: false },
  ] },
  enterprise: { Icon: Crown, color: "from-amber-400 to-orange-400", headerText: "text-white", features: [
    { text: "Todo lo de Pro", included: true },
    { text: "Reportes avanzados", included: true },
    { text: "Estadísticas premium", included: true },
    { text: "Automatizaciones", included: true },
    { text: "Soporte prioritario", included: true },
    { text: "Personalización de marca", included: true },
  ] },
};

interface PlanRow { key: string; name: string; price: number; maxOrdersPerMonth: number | null; }
interface Sub { plan: string; status: string; price: number; expiresAt: string | null; }

export default function SubscriptionPage() {
  const bakeryId = getStoredUser()?.bakeryId;
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [commission, setCommission] = useState<number | null>(null);
  const [maxFree, setMaxFree] = useState<number | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bakeryId) { setError("Tu cuenta no tiene una pastelería asociada."); return; }
    Promise.all([
      api<{ plans: PlanRow[] }>("/plans"),
      api<{ bakery: { subscription: Sub } }>(`/bakeries/${bakeryId}`),
      api<{ settings: { commissionRate: number; maxFreeOrders: number } }>("/settings/public"),
    ])
      .then(([p, b, s]) => { setPlans(p.plans); setSub(b.bakery.subscription); setCommission(s.settings.commissionRate); setMaxFree(s.settings.maxFreeOrders); })
      .catch((e) => setError(e.message));
  }, [bakeryId]);

  const currentKey = sub && sub.status === "active" ? sub.plan : "basic";
  const current = plans.find((p) => p.key === currentKey);
  const daysLeft = sub?.expiresAt ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 864e5)) : null;
  const limitText = (p: PlanRow) => {
    const limit = p.key === "basic" ? maxFree : p.maxOrdersPerMonth;
    return limit == null ? "Pedidos ilimitados" : `${limit} pedidos al mes`;
  };

  async function changePlan(body: { plan?: string; action?: "cancel" }) {
    if (!bakeryId) return;
    setBusy(true);
    setError("");
    try {
      const { bakery } = await api<{ bakery: { subscription: Sub } }>(`/bakeries/${bakeryId}/subscription`, { method: "PUT", body });
      setSub(bakery.subscription);
      setConfirmPlan(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el plan.");
    } finally {
      setBusy(false);
    }
  }

  const CurrentIcon = (STYLE[currentKey] || STYLE.basic).Icon;
  const target = plans.find((p) => p.key === confirmPlan);
  const TargetIcon = target ? (STYLE[target.key] || STYLE.basic).Icon : Star;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Mi plan</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Administra tu suscripción de BakeFlow</p>
      </div>

      {error && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

      {current && (
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center">
            <CurrentIcon size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-foreground">Plan actual: <span className="text-purple-600">{current.name}</span>
              {sub?.status === "cancelled" && <span className="ml-2 text-xs font-bold text-rose-500">(cancelado)</span>}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {sub?.expiresAt && currentKey !== "basic" ? `Renovación el ${new Date(sub.expiresAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} · ` : ""}
              {current.price > 0 ? `$${current.price}/mes` : "Sin costo"}
            </div>
          </div>
          <div className="text-right">
            {daysLeft !== null && currentKey !== "basic" && <div className="font-bold text-foreground text-sm">{daysLeft} días restantes</div>}
            {currentKey !== "basic" && (
              <button onClick={() => changePlan({ action: "cancel" })} disabled={busy} className="text-xs text-rose-500 font-bold hover:text-rose-600">Cancelar suscripción</button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const st = STYLE[plan.key] || STYLE.basic;
          const PlanIcon = st.Icon;
          const isCurrent = plan.key === currentKey;
          return (
            <div key={plan.key} className={`relative rounded-3xl overflow-hidden border-2 transition-all ${isCurrent ? "border-purple-400 shadow-lg shadow-purple-100" : "border-border card-shadow hover:border-pink-200"}`}>
              {st.popular && (
                <div className="absolute top-4 right-4 bg-white text-purple-600 text-xs font-bold px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1">
                  <Zap size={11} /> Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 left-4 bg-white text-green-600 text-xs font-bold px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                  <Check size={11} /> Actual
                </div>
              )}

              <div className={`bg-gradient-to-br ${st.color} p-6 pt-12`}>
                <PlanIcon size={32} className={plan.key === "basic" ? "text-pink-600 mb-2" : "text-white mb-2"} />
                <div className={`font-display text-2xl font-bold ${st.headerText}`}>{plan.name}</div>
                <div className={st.headerText}>
                  {plan.price === 0
                    ? <span className="font-display text-3xl font-bold">Gratis</span>
                    : <><span className="font-display text-3xl font-bold">${plan.price}</span><span className="text-sm opacity-80">/mes</span></>}
                </div>
              </div>

              <div className="bg-card p-5">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Check size={14} className="text-green-500 shrink-0" /> <span>{limitText(plan)}</span>
                  </div>
                  {st.features.map((f) => (
                    <div key={f.text} className={`flex items-center gap-2 text-sm font-medium ${f.included ? "text-foreground" : "text-muted-foreground"}`}>
                      {f.included ? <Check size={14} className="text-green-500 shrink-0" /> : <X size={14} className="text-muted-foreground shrink-0" />}
                      <span className={!f.included ? "line-through" : ""}>{f.text}</span>
                    </div>
                  ))}
                </div>
                {commission !== null && (
                  <div className="text-xs text-muted-foreground font-semibold mb-4 bg-muted rounded-xl px-3 py-2">
                    {commission}% de comisión sobre ventas
                  </div>
                )}
                {!isCurrent ? (
                  <button onClick={() => setConfirmPlan(plan.key)}
                    className={`w-full py-3 font-bold rounded-2xl text-sm transition-all active:scale-95 ${plan.key === "basic" ? "border-2 border-border text-foreground hover:bg-muted" : "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md hover:shadow-lg"}`}>
                    Cambiar a {plan.name}
                  </button>
                ) : (
                  <button className="w-full py-3 bg-muted text-muted-foreground font-bold rounded-2xl text-sm cursor-default flex items-center justify-center gap-2">
                    <Check size={14} /> Plan actual
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {target && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl card-shadow-lg p-6 border border-border animate-pop text-center">
            <div className={`w-16 h-16 bg-gradient-to-br ${(STYLE[target.key] || STYLE.basic).color} rounded-3xl flex items-center justify-center mx-auto mb-4`}>
              <TargetIcon size={28} className={target.key === "basic" ? "text-pink-600" : "text-white"} />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">Cambiar a plan {target.name}</h2>
            <p className="text-sm text-muted-foreground font-medium mb-6">
              {target.price === 0 ? "Perderás acceso a las funciones de pago y volverás al límite de pedidos mensual." : `Se realizará un cobro de $${target.price}/mes a partir de hoy.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPlan(null)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted">Cancelar</button>
              <button onClick={() => changePlan({ plan: target.key })} disabled={busy}
                className="disabled:opacity-60 flex-1 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md">{busy ? "Procesando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}