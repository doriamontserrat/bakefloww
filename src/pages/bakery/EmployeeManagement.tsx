import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Plus, Pencil, X, Users } from "lucide-react";

const ROLES = ["Pastelera", "Decoradora", "Repartidora", "Cajera", "Asistente"];

interface Employee { id: string; name: string; role: string; email: string; phone: string; active: boolean; orders: number; }

function toEmployee(u: any, orders: number): Employee {
  return { id: u._id, name: u.name, role: u.jobTitle || "Asistente", email: u.email, phone: u.phone || "", active: u.status === "active", orders };
}
const ROLE_COLORS: Record<string, string> = {
  Pastelera: "bg-pink-100 text-pink-700",
  Decoradora: "bg-purple-100 text-purple-700",
  Repartidora: "bg-blue-100 text-blue-700",
  Cajera: "bg-amber-100 text-amber-700",
  Asistente: "bg-green-100 text-green-700",
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", role: "Pastelera", email: "", phone: "", password: "" });

  useEffect(() => {
    Promise.all([
      api<{ users: any[] }>("/users"),
      api<{ orders: any[] }>("/orders").catch(() => ({ orders: [] as any[] })),
    ])
      .then(([u, o]) => {
        const counts: Record<string, number> = {};
        o.orders.forEach((ord) => { const id = ord.assignedEmployeeId?._id; if (id) counts[id] = (counts[id] || 0) + 1; });
        setEmployees(u.users.map((usr) => toEmployee(usr, counts[usr._id] || 0)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openNew() { setEditEmp(null); setError(""); setForm({ name: "", role: "Pastelera", email: "", phone: "", password: "" }); setShowModal(true); }
  function openEdit(emp: Employee) { setEditEmp(emp); setError(""); setForm({ name: emp.name, role: emp.role, email: emp.email, phone: emp.phone, password: "" }); setShowModal(true); }

  async function save() {
    if (!form.name.trim() || (!editEmp && (!form.email.trim() || form.password.length < 6))) {
      setError(editEmp ? "El nombre es obligatorio." : "Nombre, correo y una contraseña de al menos 6 caracteres son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editEmp) {
        const { employee } = await api<{ employee: any }>("/users/employees/" + editEmp.id, {
          method: "PUT", body: { name: form.name.trim(), phone: form.phone, jobTitle: form.role },
        });
        setEmployees((prev) => prev.map((e) => e.id === editEmp.id ? toEmployee(employee, e.orders) : e));
      } else {
        const { employee } = await api<{ employee: any }>("/users/employees", {
          method: "POST",
          body: { name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: form.password, jobTitle: form.role },
        });
        setEmployees((prev) => [...prev, toEmployee(employee, 0)]);
      }
      setShowModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la empleada.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string) {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    setError("");
    try {
      await api("/users/employees/" + id, { method: "PUT", body: { status: emp.active ? "suspended" : "active" } });
      setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, active: !e.active } : e));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    }
  }
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
            <Users size={28} className="text-pink-400" /> Empleados
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">{employees.filter((e) => e.active).length} activas de {employees.length}</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md text-sm active:scale-95 transition-all">
          <Plus size={16} /> Agregar empleada
        </button>
      </div>

      {error && !showModal && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="text-sm text-muted-foreground mb-4">Cargando empleados...</p>}
      {!loading && employees.length === 0 && <p className="text-sm text-muted-foreground mb-4">Aún no has registrado empleadas.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className={`bg-card rounded-3xl card-shadow border p-5 transition-all ${emp.active ? "border-border" : "border-dashed border-border opacity-60"}`}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-violet-400 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm shrink-0">
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground">{emp.name}</div>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${ROLE_COLORS[emp.role] || "bg-muted text-muted-foreground"}`}>
                  {emp.role}
                </span>
                <div className="text-xs text-muted-foreground mt-1.5">{emp.email}</div>
                <div className="text-xs text-muted-foreground">{emp.phone}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${emp.active ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {emp.active ? "Activa" : "Inactiva"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{emp.orders} pedidos</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(emp)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-pink-50 text-pink-500 text-xs font-bold rounded-xl hover:bg-pink-100 transition-colors">
                <Pencil size={12} /> Editar
              </button>
              <button onClick={() => toggle(emp.id)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${emp.active ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                {emp.active ? "Suspender" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow-lg p-6 border border-border animate-pop">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold">{editEmp ? "Editar empleada" : "Nueva empleada"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: "name", label: "Nombre completo", type: "text", ph: "Nombre de la empleada" },
                { key: "email", label: "Correo electrónico", type: "email", ph: "correo@pasteleria.com" },
                { key: "phone", label: "Teléfono", type: "tel", ph: "+52 55 0000 0000" },
                ...(editEmp ? [] : [{ key: "password", label: "Contraseña inicial", type: "password", ph: "Mínimo 6 caracteres" }]),
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-foreground mb-1.5">{f.label}</label>
                  <input type={f.type} value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.ph} disabled={!!editEmp && f.key === "email"} className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium">
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              {error && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted">Cancelar</button>
                <button onClick={save} disabled={saving} className="disabled:opacity-60 flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md">
                  {editEmp ? "Guardar" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
