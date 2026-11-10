import { Lock, Crown, Star } from "lucide-react";

const PLAN_LABEL: Record<string, string> = { pro: "Pro", enterprise: "Premium" };

/** Pantalla que reemplaza una sección bloqueada por el plan actual. */
export default function UpgradePrompt({ feature, plan = "pro", onUpgrade }: {
  feature: string; plan?: "pro" | "enterprise"; onUpgrade?: () => void;
}) {
  const Icon = plan === "enterprise" ? Crown : Star;
  return (
    <div className="p-6 max-w-xl mx-auto text-center py-16">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg">
        <Lock size={32} className="text-white" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-foreground mb-2">{feature}</h1>
      <p className="text-sm text-muted-foreground font-medium mb-6">
        Esta función está disponible desde el plan <span className="font-bold text-purple-600">{PLAN_LABEL[plan]}</span>.
        Mejora tu plan para desbloquearla.
      </p>
      {onUpgrade && (
        <button onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95">
          <Icon size={16} /> Ver planes
        </button>
      )}
    </div>
  );
}
