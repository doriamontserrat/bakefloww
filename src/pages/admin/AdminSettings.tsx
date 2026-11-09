import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Settings, CheckCircle2 } from "lucide-react";

type Form = {
  siteName: string; supportEmail: string; commissionRate: string; maxFreeOrders: string;
  maintenanceMode: boolean; emailNotifications: boolean; autoRenew: boolean; welcomeBonus: boolean;
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Form>({
    siteName: "", supportEmail: "", commissionRate: "", maxFreeOrders: "",
    maintenanceMode: false, emailNotifications: true, autoRenew: true, welcomeBonus: false,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ settings: any }>("/settings")
      .then(({ settings: s }) => setSettings({
        siteName: s.siteName, supportEmail: s.supportEmail, commissionRate: String(s.commissionRate), maxFreeOrders: String(s.maxFreeOrders),
        maintenanceMode: s.maintenanceMode, emailNotifications: s.emailNotifications, autoRenew: s.autoRenew, welcomeBonus: s.welcomeBonus,
      }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const commission = Number(settings.commissionRate);
    const maxFree = Number(settings.maxFreeOrders);
    if (!settings.siteName.trim() || !(commission >= 0 && commission <= 100) || !(maxFree >= 0)) {
      setError("Revisa los datos: la comisión debe estar entre 0 y 100 y el límite de pedidos no puede ser negativo.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api("/settings", { method: "PUT", body: { ...settings, commissionRate: commission, maxFreeOrders: maxFree } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3"><Settings size={28} className="text-pink-400" /> Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Ajustes generales de la plataforma BakeFlow</p>
      </div>

      {error && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-5 text-sm text-muted-foreground">Cargando configuración...</p>}
      {saved && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> Configuración guardada correctamente
        </div>
      )}

      <div className="space-y-5">
        <div className="bg-card rounded-3xl card-shadow border border-border p-6">
          <h2 className="font-bold text-foreground mb-4">General</h2>
          <div className="space-y-4">
            {[
              { key: "siteName", label: "Nombre de la plataforma", type: "text" },
              { key: "supportEmail", label: "Email de soporte", type: "email" },
              { key: "commissionRate", label: "Comisión de la plataforma por venta (%)", type: "number" },
              { key: "maxFreeOrders", label: "Pedidos máximos plan Gratuito", type: "number" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-foreground mb-1.5">{f.label}</label>
                <input type={f.type} value={settings[f.key as keyof typeof settings] as string}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-3xl card-shadow border border-border p-6">
          <h2 className="font-bold text-foreground mb-4">Opciones del sistema</h2>
          <div className="space-y-4">
            {[
              { key: "maintenanceMode", label: "Modo mantenimiento", desc: "Solo el administrador puede operar mientras está activo" },
              { key: "emailNotifications", label: "Notificaciones por email", desc: "Preferencia guardada (el envío de correos aún no está activo)" },
              { key: "autoRenew", label: "Renovación automática", desc: "Preferencia guardada (los cobros son simulados)" },
              { key: "welcomeBonus", label: "Bono de bienvenida", desc: "1 mes Pro gratis para nuevas pastelerías" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-bold text-sm text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, [opt.key]: !settings[opt.key as keyof typeof settings] })}
                  className={`relative w-12 h-6 rounded-full transition-all ${settings[opt.key as keyof typeof settings] ? "bg-pink-500" : "bg-muted border border-border"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${settings[opt.key as keyof typeof settings] ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving || loading}
          className="disabled:opacity-60 w-full py-3.5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95">
          <span className="flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Guardar configuración</span>
        </button>
      </div>
    </div>
  );
}
