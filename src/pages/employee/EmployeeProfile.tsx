import { useState, useRef, useEffect } from "react";
import { api, updateStoredUser, uploadImage } from "../../services/api";
import { validateName, validateTitle, validatePhone, validateAddress, validateBirthday, validatePassword, firstError, sanitizeField, maxBirthday, minBirthday } from "../../utils/validators";
import { Mail, Phone, MapPin, User, Pencil, Check, Cake, ImagePlus, X, Calendar, Package, Star, Lock, Eye, EyeOff } from "lucide-react";

interface Props { userName: string; }

export default function EmployeeProfile({ userName }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: userName, position: "", email: "", phone: "", address: "", birthday: "" });
  const [loadError, setLoadError] = useState("");
  const [stats, setStats] = useState({ orders: 0, cakes: 0, months: 0 });

  useEffect(() => {
    Promise.all([api<{ user: any }>("/auth/me"), api<{ orders: any[] }>("/orders")])
      .then(([{ user }, { orders }]) => {
        setForm({
          name: user.name, position: user.jobTitle || "Empleada", email: user.email, phone: user.phone || "",
          address: user.address || "", birthday: user.birthday ? user.birthday.slice(0, 10) : "",
        });
        setPhoto(user.profilePhoto || "");
        const done = orders.filter((o) => o.status === "delivered");
        const months = Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (30.44 * 864e5)));
        setStats({ orders: done.length, cakes: done.reduce((s, o) => s + (o.items || []).reduce((t: number, i: any) => t + i.quantity, 0), 0), months });
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

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoadError("");
    try {
      const url = await uploadImage(file);
      await api("/users/profile", { method: "PUT", body: { profilePhoto: url } });
      setPhoto(url);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    }
  }

  async function removePhoto() {
    try {
      await api("/users/profile", { method: "PUT", body: { profilePhoto: "" } });
      setPhoto("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo quitar la foto.");
    }
  }
  async function save() {
    const invalid = firstError(validateName(form.name), validatePhone(form.phone), validateAddress(form.address), validateBirthday(form.birthday));
    if (invalid) { setLoadError(invalid); return; }
    setLoadError("");
    try {
      const { user } = await api<{ user: any }>("/users/profile", {
        method: "PUT",
        body: { name: form.name.trim(), phone: form.phone, address: form.address, birthday: form.birthday || null },
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
    { key: "name",      label: "Nombre completo",    type: "text",  Icon: User },
    { key: "email",      label: "Correo electrónico", type: "email", Icon: Mail },
    { key: "phone",      label: "Teléfono",           type: "tel",   Icon: Phone },
    { key: "address",    label: "Dirección",          type: "text",  Icon: MapPin },
    { key: "birthday",   label: "Fecha de nacimiento", type: "date", Icon: Calendar },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Mi perfil</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Tu información como empleada</p>
      </div>

      {/* Estadísticas movidas arriba */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Pedidos completados", value: String(stats.orders), Icon: Package },
          { label: "Pasteles elaborados", value: String(stats.cakes), Icon: Cake },
          { label: "Meses en la empresa", value: String(stats.months), Icon: Calendar },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-card rounded-3xl card-shadow border border-border p-4 text-center">
            <div className="flex justify-center mb-1">
              <Icon size={22} className="text-indigo-400" />
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
                <img src={photo} alt="Perfil" className="w-20 h-20 rounded-3xl object-cover border-2 border-indigo-200 shadow-md" />
                {editing && (
                  <button onClick={removePhoto}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center">
                    <X size={10} />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-violet-400 rounded-3xl flex items-center justify-center text-3xl text-white font-bold shadow-md">
                {form.name.charAt(0).toUpperCase()}
              </div>
            )}
            {editing && (
              <button onClick={() => photoRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors">
                <ImagePlus size={12} />
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-foreground">{form.name}</div>
            <div className="text-sm text-muted-foreground font-medium">{form.position}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
              <User size={11} /> Empleada
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl card-shadow border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-foreground">Información personal</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-500 border border-indigo-200 font-bold text-sm rounded-2xl hover:bg-indigo-100 transition-colors">
              <Pencil size={13} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-border text-muted-foreground font-bold text-sm rounded-2xl hover:bg-muted">Cancelar</button>
              <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white font-bold text-sm rounded-2xl hover:bg-indigo-600">
                <Check size={13} /> Guardar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {fields.map(({ key, label, type, Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-1.5">
                <Icon size={13} className="text-indigo-400" /> {label}
              </label>
              {editing ? (
                <input type={type} disabled={key === "email"} value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: sanitizeField(key, e.target.value) })}
                  {...(type === "date" ? { min: minBirthday(), max: maxBirthday() } : {})} maxLength={key === "description" ? 300 : key === "address" ? 150 : 80}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-indigo-400 transition-colors text-sm font-medium" />
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
          <Lock size={16} className="text-indigo-400" /> Cambiar contraseña
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
            className="w-full py-3 bg-gradient-to-r from-indigo-400 to-violet-400 text-white font-bold rounded-2xl text-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
            <Lock size={14} /> Actualizar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}