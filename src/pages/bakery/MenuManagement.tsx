import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Cake, ImagePlus, Package } from "lucide-react";
import { api, getStoredUser, uploadImage } from "../../services/api";
import { validateTitle, validatePrice } from "../../utils/validators";

interface Item { 
  id: string; 
  name: string; 
  category: string; 
  categoryId: string | null; 
  price: number; 
  active: boolean; 
  desc: string; 
  image: string; 
  stock: number; 
}
interface Category { _id: string; name: string; isActive?: boolean; }

function toItem(p: any): Item {
  return {
    id: p._id, name: p.name, category: p.categoryId?.name || "Sin categoría", categoryId: p.categoryId?._id || null,
    price: p.price, active: p.isAvailable, desc: p.description || "", image: p.imageUrl || "", stock: p.stock || 0,
  };
}

export default function MenuManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState({ name: "", categoryId: "", price: "", desc: "", image: "", stock: "0" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bakeryId = getStoredUser()?.bakeryId;
    Promise.all([
      api<{ products: any[] }>(`/products${bakeryId ? `?bakeryId=${bakeryId}` : ""}`),
      api<{ categories: Category[] }>("/categories"),
    ])
      .then(([p, c]) => { setItems(p.products.map(toItem)); setCategories(c.categories); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditItem(null);
    setFormError("");
    setForm({ name: "", categoryId: "", price: "", desc: "", image: "", stock: "0" });
    setShowModal(true);
  }
  
  function openEdit(item: Item) {
    setEditItem(item);
    setFormError("");
    setForm({ 
      name: item.name, 
      categoryId: item.categoryId || "", 
      price: String(item.price), 
      desc: item.desc, 
      image: item.image, 
      stock: String(item.stock) 
    });
    setShowModal(true);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError("");
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    }
  }

  async function save() {
    const stock = Number(form.stock);
    const invalid =
      validateTitle(form.name, "El nombre del producto", 2, 80) ||
      (!form.categoryId ? "Selecciona una categoría." : "") ||
      validatePrice(form.price, "El precio") ||
      (!Number.isInteger(stock) || stock < 0 ? "El stock debe ser un número entero mayor o igual a 0." : "") ||
      (!form.image ? "La imagen del producto es obligatoria." : "") ||
      (form.desc.trim().length < 10 ? "La descripción es obligatoria (mínimo 10 caracteres)." : form.desc.trim().length > 500 ? "La descripción no puede superar 500 caracteres." : "");
    if (invalid) { setFormError(invalid); return; }
    setFormError("");
    setError("");
    const body = {
      name: form.name.trim(),
      description: form.desc.trim(),
      price: Number(form.price),
      imageUrl: form.image,
      categoryId: form.categoryId,
      stock
    };
    try {
      if (editItem) {
        const { product } = await api("/products/" + editItem.id, { method: "PUT", body });
        setItems((prev) => prev.map((i) => i.id === editItem.id
          ? { ...i, ...toItem({ ...product, categoryId: categories.find((c) => c._id === form.categoryId) || null }) } : i));
      } else {
        const { product } = await api("/products", { method: "POST", body });
        setItems((prev) => [...prev, toItem({ ...product, categoryId: categories.find((c) => c._id === form.categoryId) || null })]);
      }
      setShowModal(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar el producto.");
    }
  }

  async function toggle(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      await api("/products/" + id, { method: "PUT", body: { isAvailable: !item.active } });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, active: !i.active } : i));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al actualizar."); }
  }

  async function remove(id: string) {
    try {
      await api("/products/" + id, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Error al eliminar."); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Mi Menú</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">{items.filter((i) => i.active).length} productos activos</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 text-sm">
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      {error && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}
      {loading && <p className="text-sm text-muted-foreground">Cargando menú...</p>}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`bg-card rounded-3xl card-shadow border transition-all flex flex-col ${item.active ? "border-border" : "border-dashed border-border opacity-60"}`}>
            <div className="h-36 rounded-t-3xl overflow-hidden bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center shrink-0">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <Cake size={48} className="text-pink-300" />}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-bold text-sm text-foreground">{item.name}</div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.active ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {item.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">{item.category}</div>
              <div className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{item.desc}</div>
              
              <div className="flex items-center justify-between mb-3 mt-auto">
                <div className="font-display text-lg font-semibold text-pink-500">${item.price}</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted px-2 py-1.5 rounded-xl border border-border">
                  <Package size={14} className="text-pink-400" />
                  <span>Stock: {item.stock}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-pink-50 text-pink-500 text-xs font-bold rounded-xl hover:bg-pink-100 transition-colors">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => toggle(item.id)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${item.active ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                  {item.active ? "Pausar" : "Activar"}
                </button>
                <button onClick={() => remove(item.id)} className="w-9 py-2 bg-red-50 text-red-400 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow p-6 border border-border animate-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold">{editItem ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Imagen del producto *</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                {form.image ? (
                  <div className="relative rounded-2xl overflow-hidden h-36 group cursor-pointer" onClick={() => fileRef.current?.click()}>
                    <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                      <ImagePlus size={16} /> Cambiar imagen
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-28 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors flex flex-col items-center justify-center gap-2 text-pink-400">
                    <ImagePlus size={24} />
                    <span className="text-xs font-bold">Subir imagen</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del producto" maxLength={80}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Categoría *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium">
                  <option value="">Selecciona una categoría...</option>
                  {categories.filter((c) => c.isActive !== false || c._id === form.categoryId).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {categories.length === 0 && <p className="text-xs text-amber-700 font-semibold mt-1.5">Aún no tienes categorías. Créalas primero en la sección "Categorías".</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Precio ($) *</label>
                  <input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Stock (Cantidad)</label>
                  <input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, "") })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción *</label>
                <textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  rows={2} maxLength={500} placeholder="Describe tu delicia (mínimo 10 caracteres)..."
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium resize-none" />
              </div>
              {formError && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border-2 border-border text-foreground font-bold rounded-2xl hover:bg-muted">Cancelar</button>
                <button onClick={save}
                  className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md">
                  {editItem ? "Guardar" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}