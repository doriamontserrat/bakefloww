import { useState, useEffect } from "react";
import { api, getStoredUser } from "../../services/api";
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, ArrowRightLeft, Send, Check, X, Sparkles, Building2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

function toProduct(p: any): Product {
  return { id: p._id, name: p.name, price: p.price, category: p.categoryId?.name || "Otros", image: p.imageUrl || "", stock: p.stock ?? 0 };
}
export default function BakeryPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saleError, setSaleError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [cardType, setCardType] = useState<"debit" | "credit">("debit");
  const [clientEmail, setClientEmail] = useState("");
  const [saleCompleted, setSaleCompleted] = useState(false);

  function loadProducts() {
    const bakeryId = getStoredUser()?.bakeryId;
    api<{ products: any[] }>(`/products${bakeryId ? `?bakeryId=${bakeryId}` : ""}`)
      .then(({ products }) => setProducts(products.filter((p) => p.isAvailable && p.stock > 0).map(toProduct)))
      .catch((e) => setLoadError(e.message));
  }
  useEffect(loadProducts, []);

  const CATEGORIES = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];

  // Add to cart (sin superar el stock disponible)
  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  // Update quantity
  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQty = Math.min(item.quantity + delta, item.product.stock);
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  // Remove item
  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  }

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;
  const cashAmount = parseFloat(cashGiven) || 0;
  const change = cashAmount >= total ? cashAmount - total : 0;

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Registra la venta en el backend (descuenta stock y genera el ingreso en finanzas)
  async function handleCompleteSale(e: React.FormEvent) {
    e.preventDefault();
    setSaleError("");
    setSubmitting(true);
    try {
      await api("/orders", {
        method: "POST",
        body: {
          orderType: "standard",
          isPointOfSale: true,
          paymentMethod,
          deliveryMethod: "pickup",
          deliveryDate: new Date().toISOString(),
          customerEmail: clientEmail.trim() || undefined,
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        },
      });
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "No se pudo registrar la venta.");
      setSubmitting(false);
      loadProducts(); // el stock pudo haber cambiado
      return;
    }
    setSubmitting(false);
    setSaleCompleted(true);
    loadProducts();
    setTimeout(() => {
      setSaleCompleted(false);
      setShowCheckout(false);
      setCart([]);
      setCashGiven("");
      setClientEmail("");
    }, 2500);
  }
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-3">
          <ShoppingBag size={28} className="text-pink-400" /> Nueva Venta
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          Selecciona los productos y realiza el cobro
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-5">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-sm font-medium transition-colors"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-pink-500 text-white shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:bg-pink-50 hover:text-pink-500"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loadError && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{loadError}</div>}
          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative bg-card rounded-3xl border border-border card-shadow overflow-hidden cursor-pointer hover:border-pink-300 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div className="relative h-36 overflow-hidden">
                  {product.image ? <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  /> : <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold">Sin imagen</div>}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white text-pink-600 font-bold text-xs px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 scale-90 group-hover:scale-100 transition-transform">
                      <Plus size={14} /> Agregar
                    </span>
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="text-xs text-muted-foreground font-semibold">{product.category} · Stock: {product.stock}</div>
                  <div className="font-semibold text-sm text-foreground truncate">{product.name}</div>
                  <div className="font-display font-bold text-pink-500 text-base mt-1">
                    ${product.price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="bg-card rounded-3xl card-shadow border border-border p-5 flex flex-col justify-between h-[620px] sticky top-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <ShoppingBag size={18} className="text-pink-400" /> Resumen de Orden
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 bg-pink-50 text-pink-600 rounded-full border border-pink-100">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingBag size={40} className="mx-auto mb-2 text-pink-200" />
                  <p className="text-sm font-medium">No hay productos seleccionados</p>
                </div>
              ) : (
                cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3 p-2.5 bg-muted rounded-2xl">
                    <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-foreground truncate">{product.name}</div>
                      <div className="text-xs font-bold text-pink-500">${(product.price * quantity).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border p-1">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Footer */}
          <div className="pt-4 border-t border-border mt-auto">
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/50">
                <span>Total</span>
                <span className="text-pink-500 font-display text-xl">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles size={16} /> Cobrar ${total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cobro */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border card-shadow max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
            >
              <X size={18} />
            </button>

            {saleCompleted ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check size={32} />
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">¡Venta Exitosa!</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  La venta quedó registrada y el stock se actualizó.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCompleteSale} className="space-y-4">
                <h3 className="font-display text-xl font-bold text-foreground mb-1">Cobrar Orden</h3>
                
                {/* Desglose rápido */}
                <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-pink-700">Total a pagar</span>
                  <span className="font-display text-2xl font-bold text-pink-600">${total.toFixed(2)}</span>
                </div>

                {/* Método de pago */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "cash", label: "Efectivo", Icon: Banknote },
                      { id: "card", label: "Tarjeta", Icon: CreditCard },
                      { id: "transfer", label: "Transf.", Icon: ArrowRightLeft },
                    ].map(({ id, label, Icon }) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setPaymentMethod(id as any)}
                        className={`py-2.5 px-2 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === id
                            ? "border-pink-400 bg-pink-50 text-pink-600"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cálculo de cambio si es efectivo */}
                {paymentMethod === "cash" && (
                  <div className="grid grid-cols-2 gap-3 bg-muted p-3 rounded-2xl">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Paga con</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-border bg-card focus:outline-none focus:border-pink-400 text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Cambio</label>
                      <div className="font-display text-base font-bold text-foreground pt-1.5">
                        ${change.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Opciones de Tarjeta (Débito / Crédito) */}
                {paymentMethod === "card" && (
                  <div className="bg-muted p-3 rounded-2xl space-y-2">
                    <label className="text-xs font-bold text-foreground block">Tipo de tarjeta</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCardType("debit")}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                          cardType === "debit"
                            ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Débito
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardType("credit")}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                          cardType === "credit"
                            ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Crédito
                      </button>
                    </div>
                  </div>
                )}

                {/* Información de Transferencia (Número de cuenta / CLABE) */}
                {paymentMethod === "transfer" && (
                  <div className="bg-pink-50/70 border border-pink-200 p-3.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-pink-700">
                      <Building2 size={15} className="text-pink-500" /> Datos para Transferencia
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Banco: <span className="font-bold text-foreground">BBVA México</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      CLABE Interbancaria: <span className="font-bold text-foreground">012180001234567890</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Cuenta No.: <span className="font-bold text-foreground">1234567890</span>
                    </div>
                  </div>
                )}

                {/* Envío de ticket por correo */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Correo del cliente (opcional, vincula la venta a su cuenta)
                  </label>
                  <div className="relative">
                    <Send size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-2xl border-2 border-border bg-card focus:outline-none focus:border-pink-400 text-xs font-medium"
                    />
                  </div>
                </div>

                {saleError && <div className="bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{saleError}</div>}

                {/* Botón confirmar */}
                <button
                  type="submit"
                  disabled={submitting || (paymentMethod === "cash" && cashAmount < total)}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  Finalizar Pago
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}