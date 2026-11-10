import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { validateName, validateEmail, validatePhone, validatePassword, validateTitle, firstError, sanitizeField } from "../../utils/validators";
import { Search, ShoppingBag, Store, Users, User, ShieldOff, ShieldCheck, Plus, X, Mail, Phone, Lock } from "lucide-react";

interface UserRow { id: string; name: string; email: string; role: string; bakery: string; status: string; date: string; }

function toRow(u: any): UserRow {
  return {
    id: u._id, name: u.name, email: u.email, role: u.role, bakery: u.bakeryId?.name || "-", status: u.status,
    date: new Date(u.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
  };
}
const ROLE_META: Record<string, { label: string; class: string; Icon: React.ComponentType<{ size?: number }> }> = {
  customer: { label: "Cliente",    class: "bg-pink-50 text-pink-600",    Icon: ShoppingBag },
  bakery:   { label: "Pastelería", class: "bg-violet-50 text-violet-600", Icon: Store },
  employee: { label: "Empleado",   class: "bg-indigo-50 text-indigo-600", Icon: User },
  admin:    { label: "Admin",      class: "bg-rose-50 text-rose-600",     Icon: Users },
};

const BLANK = { name: "", email: "", phone: "", role: "admin", bakery: "", password: "" };

type TabType = "admins" | "clients";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ users: any[] }>("/users")
      .then(({ users }) => setUsers(users.map(toRow)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<TabType>("admins");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState("");

  const adminUsers = users.filter((u) => u.role === "admin");
  const clientUsers = users.filter((u) => u.role !== "admin");

  const baseList = activeTab === "admins" ? adminUsers : clientUsers;

  const filtered = baseList.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Bloquear / desbloquear: el usuario bloqueado ya no puede iniciar sesión ni usar la API
  async function toggleBlock(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const status = user.status === "active" ? "blocked" : "active";
    setError("");
    try {
      await api(`/users/${id}/status`, { method: "PATCH", body: { status } });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado del usuario.");
    }
  }
  function setF(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: sanitizeField(key, val) }));
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const invalid = firstError(
      validateName(form.name), validateEmail(form.email), validatePhone(form.phone), validatePassword(form.password),
      form.role === "bakery" && form.bakery.trim() ? validateTitle(form.bakery, "El nombre de la pastelería") : "",
    );
    if (invalid) { setFormError(invalid); return; }
    setSaving(true);
    try {
      const { user } = await api<{ user: any }>("/users", {
        method: "POST",
        body: { name: form.name.trim(), email: form.email.trim(), phone: form.phone, role: form.role, password: form.password, bakeryName: form.bakery.trim() },
      });
      // El backend devuelve el usuario sin la pastelería poblada: se completa con el nombre indicado
      setUsers((prev) => [...prev, { ...toRow(user), bakery: form.bakery.trim() || (form.role === "bakery" ? form.name : "-") }]);
      setForm(BLANK);
      setFormError("");
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }
  const clientRoleOptions = [["all", "Todos"], ["bakery", "Pastelerías"], ["employee", "Empleados"], ["customer", "Clientes"]];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
            <Users size={28} className="text-pink-400" /> Usuarios
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">{users.length} usuarios en la plataforma</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); setForm({ ...BLANK, role: activeTab === "admins" ? "admin" : "bakery" }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-sm transition-all text-sm">
          <Plus size={15} /> Crear usuario
        </button>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="mb-4 text-sm text-muted-foreground">Cargando usuarios...</p>}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => { setActiveTab("admins"); setRoleFilter("all"); setSearch(""); }}
          className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${activeTab === "admins" ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
          Usuarios ({adminUsers.length})
        </button>
        <button onClick={() => { setActiveTab("clients"); setRoleFilter("all"); setSearch(""); }}
          className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${activeTab === "clients" ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
          Clientes ({clientUsers.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium" />
        </div>
        {activeTab === "clients" && (
          <div className="flex gap-2 flex-wrap">
            {clientRoleOptions.map(([val, label]) => (
              <button key={val} onClick={() => setRoleFilter(val)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all ${roleFilter === val ? "bg-pink-500 text-white" : "bg-card border border-border text-muted-foreground hover:border-pink-200"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl card-shadow border border-border overflow-hidden">
        <div className="grid grid-cols-6 gap-3 px-5 py-3 bg-muted text-xs font-bold text-muted-foreground">
          <span className="col-span-2">Usuario</span><span>Rol</span><span>Empresa</span><span>Estado</span><span>Acción</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground text-sm">Sin usuarios en esta categoría</div>
          ) : filtered.map((u) => {
            const meta = ROLE_META[u.role];
            const MetaIcon = meta.Icon;
            return (
              <div key={u.id} className="grid grid-cols-6 gap-3 px-5 py-4 items-center">
                <div className="col-span-2">
                  <div className="font-bold text-sm text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${meta.class}`}>
                  <MetaIcon size={10} /> {meta.label}
                </span>
                <span className="text-xs text-muted-foreground font-medium truncate">{u.bakery}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${u.status === "active" ? "badge-ready" : "badge-cancelled"}`}>
                  {u.status === "active" ? "Activo" : "Bloqueado"}
                </span>
                <button onClick={() => toggleBlock(u.id)}
                  className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${u.status === "active" ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                  {u.status === "active" ? <><ShieldOff size={11} /> Bloquear</> : <><ShieldCheck size={11} /> Desbloquear</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl card-shadow-xl w-full max-w-md p-6 animate-pop">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Users size={20} className="text-pink-400" /> Crear usuario
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={createUser} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <User size={12} className="text-pink-400" /> Nombre completo *
                </label>
                <input type="text" value={form.name} onChange={(e) => setF("name", e.target.value)}
                  placeholder="Nombre del usuario" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} className="text-pink-400" /> Correo electrónico *
                </label>
                <input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)}
                  placeholder="correo@ejemplo.com" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <Phone size={12} className="text-pink-400" /> Teléfono
                </label>
                <input type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)}
                  placeholder="+52 55 1234 5678" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">Tipo de cuenta</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "admin", label: "Admin" },
                    { value: "bakery", label: "Pastelería" },
                    { value: "employee", label: "Empleado" },
                    { value: "customer", label: "Cliente" },
                  ].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setF("role", value)}
                      className={`py-2 rounded-2xl text-xs font-bold border transition-all ${form.role === value ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(form.role === "bakery" || form.role === "employee") && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                    <Store size={12} className="text-pink-400" /> {form.role === "bakery" ? "Nombre de la pastelería" : "Pastelería"}
                  </label>
                  <input type="text" value={form.bakery} onChange={(e) => setF("bakery", e.target.value)}
                    placeholder="Nombre de la pastelería" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <Lock size={12} className="text-pink-400" /> Contraseña *
                </label>
                <input type="password" value={form.password} onChange={(e) => setF("password", e.target.value)}
                  placeholder="Contraseña temporal" className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>

              {formError && (
                <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{formError}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted transition-colors text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2">
                  <Plus size={14} /> Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
