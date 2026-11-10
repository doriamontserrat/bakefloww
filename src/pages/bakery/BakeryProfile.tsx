import { useState, useRef, useEffect } from "react";
import { api, getStoredUser, updateStoredUser, uploadImage } from "../../services/api";
import { validateName, validateTitle, validatePhone, validateAddress, validateBirthday, validatePassword, firstError, sanitizeField, maxBirthday, minBirthday } from "../../utils/validators";
import { Mail, Phone, MapPin, User, Pencil, Check, Store, ImagePlus, X, Cake, Users, DollarSign, Lock, Eye, EyeOff, Star, AlertTriangle } from "lucide-react";

interface Props { userName: string; onNavigate: (page: string) => void; }

export default function BakeryProfile({ userName, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ownerName: userName, bakeryName: "", email: "", phone: "", address: "", description: "" });
  const [bakeryId, setBakeryId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [plan, setPlan] = useState({ name: "Gratuito", features: "", price: 0 });
  const [accessEnds, setAccessEnds] = useState<string | null>(null); // fecha en que se pierde el plan de pago (si ya se canceló)
  const [stats, setStats] = useState({ orders: 0, employees: 0, income: 0 });

  useEffect(() => {
    const id = getStoredUser()?.bakeryId;
    if (!id) { setLoadError("Tu cuenta no tiene una pastelería asociada."); return; }
    setBakeryId(id);
    Promise.all([
      api<{ user: any }>("/auth/me"),
      api<{ bakery: any }>(`/bakeries/${id}`),
      api<{ plans: any[] }>("/plans"),
      api<{ orders: any[] }>("/orders"),
      api<{ users: any[] }>("/users"),
      api<{ records: any[] }>("/finances").catch(() => ({ records: [] as any[] })), // plan gratuito: sin finanzas
    ])
      .then(([{ user }, { bakery }, { plans }, { orders }, { users }, { records }]) => {
        setForm({
          ownerName: user.name, bakeryName: bakery.name, email: user.email, phone: bakery.phone || user.phone || "",
          address: bakery.address || "", description: bakery.description || "",
        });
        setPhoto(bakery.logoUrl || "");
        const active = bakery.subscription?.status === "active";
        const current = plans.find((p) => p.key === (active ? bakery.subscription.plan : "basic"));
        setAccessEnds(active && bakery.subscription.cancelAtPeriodEnd && bakery.subscription.expiresAt ? bakery.subscription.expiresAt : null);
        setPlan({ name: current ? `Plan ${current.name}` : "Plan Gratuito", features: (current?.features || []).join(" · "), price: current?.price || 0 });
        const now = new Date();
        const thisMonth = (iso: string) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); };
        setStats({
          orders: orders.filter((o) => thisMonth(o.createdAt)).length,
          employees: users.filter((u) => u.status === "active").length,
          income: records.filter((r) => r.type === "income" && thisMonth(r.date)).reduce((s, r) => s + r.amount, 0),
        });
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  const [photo, setPhoto] = useState("");
  const [saved, setSaved] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const pwInvalid = validatePassword(pwForm.next);
    if (pwInvalid) { setPwError(pwInvalid); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Las contraseñas no coinciden."); return; }
    setPwError("");
    try {
      await api("/users/password", { method: "PUT", body: { currentPassword: pwForm.current, newPassword: pwForm.next } });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
      return;
    }
    setPwForm({ current: "", next: "", confirm: "" });
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  }

  // La foto es el logo de la pastelería: se sube al servidor y se guarda con "Guardar"
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoadError("");
    try {
      setPhoto(await uploadImage(file));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    }
  }

  async function save() {
    const invalid = firstError(validateName(form.ownerName, "El nombre del dueño"), validateTitle(form.bakeryName, "El nombre de la pastelería"), validatePhone(form.phone), validateAddress(form.address), form.description.length > 300 ? "La descripción no puede superar 300 caracteres." : "");
    if (invalid) { setLoadError(invalid); return; }
    setLoadError("");
    try {
      const { user } = await api<{ user: any }>("/users/profile", { method: "PUT", body: { name: form.ownerName.trim(), phone: form.phone } });
      await api(`/bakeries/${bakeryId}`, {
        method: "PUT",
        body: { name: form.bakeryName.trim(), description: form.description, address: form.address, phone: form.phone, logoUrl: photo },
      });
      updateStoredUser({ name: user.name });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    }
  }
  const fields = [
    { key: "ownerName",    label: "Nombre del dueño",   type: "text",  Icon: User },
    { key: "bakeryName",   label: "Nombre pastelería",  type: "text",  Icon: Store },
    { key: "email",        label: "Correo electrónico", type: "email", Icon: Mail },
    { key: "phone",        label: "Teléfono",           type: "tel",   Icon: Phone },
    { key: "address",      label: "Dirección",          type: "text",  Icon: MapPin },
    { key: "description",  label: "Descripción",        type: "text",  Icon: Store },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Mi perfil</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Gestiona la información de tu pastelería</p>
      </div>

      {/* Plan management arriba de todo */}
      <div className="bg-card rounded-3xl card-shadow border border-border p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Star size={16} className="text-amber-400 fill-amber-400" /> Mi plan
          </h2>
          <button onClick={() => onNavigate("subscription")}
            className="text-xs text-pink-500 font-bold hover:text-pink-600 transition-colors">
            Ver todos los planes
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-500 rounded-2xl flex items-center justify-center shrink-0">
            <Star size={20} className="text-white fill-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-foreground">{plan.name}</div>
            <div className="text-xs text-muted-foreground">{plan.features}</div>
            <div className="text-xs font-bold text-pink-500 mt-0.5">{plan.price > 0 ? `$${plan.price} / mes` : "Sin costo"}</div>
            {accessEnds && (
              <div className="text-xs font-bold text-amber-600 mt-1">
                Plan cancelado: pierdes el acceso el {new Date(accessEnds).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
          </div>
          <button onClick={() => onNavigate("subscription")}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl transition-colors shrink-0">
            Cambiar plan
          </button>
        </div>
      </div>

      {/* Estadísticas abajo de el plan */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Pedidos este mes", value: String(stats.orders), Icon: Cake },
          { label: "Empleados activos", value: String(stats.employees), Icon: Users },
          { label: "Ingresos mensuales", value: `$${Math.round(stats.income).toLocaleString()}`, Icon: DollarSign },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-4 text-center">
            <div className="flex justify-center mb-1">
              <Icon size={22} className="text-pink-400" />
            </div>
            <div className="font-display text-xl font-semibold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground font-medium">{label}</div>
          </div>
        ))}
      </div>

      {loadError && <div className="mb-5 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{loadError}</div>}
      {saved && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2">
          <Check size={16} /> Cambios guardados correctamente
        </div>
      )}

      <div className="bg-card rounded-3xl card-shadow border border-border p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {photo ? (
              <div className="relative">
                <img src={photo} alt="Perfil" className="w-20 h-20 rounded-3xl object-cover border-2 border-pink-200 shadow-md" />
                {editing && (
                  <button onClick={() => setPhoto("")}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center">
                    <X size={10} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-pink-400 rounded-3xl flex items-center justify-center text-3xl text-white font-bold shadow-md">
                {form.bakeryName.charAt(0).toUpperCase()}
              </div>
            )}
            {editing && (
              <button onClick={() => photoRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-pink-500 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-pink-600 transition-colors">
                <ImagePlus size={12} />
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-foreground">{form.bakeryName}</div>
            <div className="text-sm text-muted-foreground font-medium">{form.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-100 text-violet-600 text-xs font-bold rounded-full">
              <Store size={11} /> Pastelería
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl card-shadow border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-foreground">Información de la pastelería</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-pink-50 text-pink-500 border border-pink-200 font-bold text-sm rounded-2xl hover:bg-pink-100 transition-colors">
              <Pencil size={13} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-border text-muted-foreground font-bold text-sm rounded-2xl hover:bg-muted">Cancelar</button>
              <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 text-white font-bold text-sm rounded-2xl hover:bg-pink-600">
                <Check size={13} /> Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {fields.map(({ key, label, type, Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
                <Icon size={13} className="text-pink-400" /> {label}
              </label>
              {editing ? (
                <input type={type} disabled={key === "email"} value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: sanitizeField(key, e.target.value) })}
                  {...(type === "date" ? { min: minBirthday(), max: maxBirthday() } : {})} maxLength={key === "description" ? 300 : key === "address" ? 150 : 80}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 transition-colors text-sm font-medium" />
              ) : (
                <div className="px-4 py-3 rounded-2xl bg-muted text-sm font-medium text-foreground">
                  {form[key as keyof typeof form]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card rounded-3xl card-shadow border border-border p-6 mt-5">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Lock size={16} className="text-pink-400" /> Cambiar contraseña
        </h2>
        {pwSaved && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2">
            <Check size={14} /> Contraseña actualizada correctamente
          </div>
        )}
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Contraseña actual</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={pwForm.current}
                onChange={e => { setPwForm(p => ({ ...p, current: e.target.value })); setPwError(""); }}
                placeholder="••••••••" className="input-base pr-12" />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input type={showNext ? "text" : "password"} value={pwForm.next}
                onChange={e => { setPwForm(p => ({ ...p, next: e.target.value })); setPwError(""); }}
                placeholder="Mín. 8: letra, número y carácter especial" className="input-base pr-12" />
              <button type="button" onClick={() => setShowNext(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Confirmar nueva contraseña</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => { setPwForm(p => ({ ...p, confirm: e.target.value })); setPwError(""); }}
              placeholder="Repite la nueva contraseña" className="input-base" />
          </div>
          {pwError && (
            <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{pwError}</div>
          )}
          <button type="submit"
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
            <Lock size={14} /> Actualizar contraseña
          </button>
        </form>
      </div>

      {/* Help / incidents shortcut */}
      <div className="flex justify-end mt-4 mb-2">
        <button onClick={() => onNavigate("incidents")}
          className="flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-full text-xs text-muted-foreground hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200 transition-colors"
          title="Reportar una incidencia">
          <AlertTriangle size={14} />
          <span className="font-semibold">Reportar incidencia</span>
        </button>
      </div>
    </div>
  );
}