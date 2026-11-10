import { useState, useEffect } from "react";
import { ShoppingCart, X, Cake, CreditCard, Lock, ChevronLeft, CheckCircle2, SlidersHorizontal, ChevronDown } from "lucide-react";
import { api } from "../../services/api";

interface MenuItem { id: string; bakeryId: string; name: string; category: string; price: number; desc: string; sizes: string[]; image: string; }

function toMenuItem(p: any): MenuItem {
  return {
    id: p._id, bakeryId: p.bakeryId?._id || p.bakeryId, name: p.name, category: p.categoryId?.name || "Otros",
    price: p.price, desc: p.description || "", sizes: p.sizes || [], image: p.imageUrl || "",
  };
}
function formatCard(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export interface CartLine { id: string; qty: number; size?: string; }
const lineKey = (c: CartLine) => `${c.id}|${c.size ?? ""}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
function cardBrand(number: string) {
  const d = number.replace(/\D/g, "")[0];
  return d === "4" ? "Visa" : d === "5" ? "Mastercard" : d === "3" ? "Amex" : "Tarjeta";
}
interface SavedCard { _id: string; cardHolder: string; last4: string; brand: string; expiryDate: string; }

interface Props {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  showCart: boolean;
  setShowCart: (v: boolean) => void;
  /** Pastelería elegida en el inicio: el menú muestra solo sus productos */
  bakery?: { id: string; name: string } | null;
  onClearBakery?: () => void;
  /** Se llama al terminar una compra (para llevar al cliente a "Mis pedidos") */
  onOrdered?: () => void;
}

export default function CustomerMenu({ cart, setCart, showCart, setShowCart, bakery, onClearBakery, onOrdered }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  // Todo producto visto alguna vez: el carrito puede tener productos de otra pastelería distinta a la del menú actual
  const [known, setKnown] = useState<Record<string, MenuItem>>({});
  const findItem = (id: string) => known[id] ?? menuItems.find((i) => i.id === id);
  const [loadError, setLoadError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details" | "payment" | "done">("cart");
  const [details, setDetails] = useState({ date: addDays(3), method: "pickup" as "pickup" | "delivery", address: "" });
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [payMode, setPayMode] = useState<string>("new"); // "card:<id>" | "new" | "cash"
  const [saveCard, setSaveCard] = useState(true);
  const [sizeError, setSizeError] = useState("");
  const [cardForm, setCardForm] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    setCategory("Todos");
    api<{ products: any[] }>(`/products${bakery ? `?bakeryId=${bakery.id}` : ""}`)
      .then(({ products }) => {
        const items = products.filter((p) => p.isAvailable).map(toMenuItem);
        setMenuItems(items);
        setKnown((k) => ({ ...k, ...Object.fromEntries(items.map((i) => [i.id, i])) }));
      })
      .catch((e) => setLoadError(e.message));
  }, [bakery?.id]);

  // Al abrir el carrito se traen las tarjetas guardadas y la dirección del perfil
  useEffect(() => {
    if (!showCart) return;
    api<{ user: { address?: string; savedCards?: SavedCard[] } }>("/auth/me")
      .then(({ user }) => {
        const cards = user.savedCards || [];
        setSavedCards(cards);
        setPayMode(cards.length ? `card:${cards[0]._id}` : "new");
        setDetails((d) => ({ ...d, address: d.address || user.address || "" }));
      })
      .catch(() => {});
  }, [showCart]);

  const CATEGORIES = ["Todos", ...Array.from(new Set(menuItems.map((i) => i.category)))];

  const filtered = menuItems.filter((i) => {
    const catMatch = category === "Todos" || category === "Otros" || i.category === category;
    const minOk = !priceMin || i.price >= Number(priceMin);
    const maxOk = !priceMax || i.price <= Number(priceMax);
    return catMatch && (category !== "Otros" || (minOk && maxOk));
  });
  const detailsValid = !!details.date && details.date >= todayStr() && (details.method === "pickup" || details.address.trim().length > 4);
  const cartTotal = cart.reduce((sum, c) => {
    const item = findItem(c.id);
    return sum + (item?.price || 0) * c.qty;
  }, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  function addToCart(id: string) {
    const item = menuItems.find((i) => i.id === id);
    if (!item) return;
    const size = selectedSize[id] ?? "";
    if (item.sizes.length && !size) { setSizeError(id); return; }
    setSizeError("");
    setCart((prev) => {
      const line: CartLine = { id, qty: 1, size: size || undefined };
      const existing = prev.find((c) => lineKey(c) === lineKey(line));
      if (existing) return prev.map((c) => lineKey(c) === lineKey(line) ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, line];
    });
  }
  function openCart() { setCheckoutStep("cart"); setShowCart(true); }
  function applyPriceFilter() { setShowPriceFilter(false); }
  function clearPriceFilter() { setPriceMin(""); setPriceMax(""); setShowPriceFilter(false); setCategory("Todos"); }

  async function removeSavedCard(id: string) {
    try {
      const { savedCards: cards } = await api<{ savedCards: SavedCard[] }>(`/users/cards/${id}`, { method: "DELETE" });
      setSavedCards(cards);
      if (payMode === `card:${id}`) setPayMode(cards.length ? `card:${cards[0]._id}` : "new");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo eliminar la tarjeta.");
    }
  }

  // Un pedido por pastelería; el precio y el total los calcula el servidor
  async function placeOrder() {
    setLoadError("");
    setOrdering(true);
    let tempCardId = "";
    try {
      let cardId = payMode.startsWith("card:") ? payMode.slice(5) : "";
      if (payMode === "new") {
        // Solo se guardan los últimos 4 dígitos, titular y vencimiento (nunca el número completo ni el CVV)
        const { savedCards: cards } = await api<{ savedCards: SavedCard[] }>("/users/cards", {
          method: "POST",
          body: { cardHolder: cardForm.name.trim(), last4: cardForm.number.replace(/\s/g, "").slice(-4), brand: cardBrand(cardForm.number), expiryDate: cardForm.expiry },
        });
        cardId = cards[cards.length - 1]._id;
        if (!saveCard) tempCardId = cardId;
      }

      const byBakery: Record<string, { productId: string; quantity: number; size: string }[]> = {};
      for (const ci of cart) {
        const item = findItem(ci.id);
        if (!item) continue;
        (byBakery[item.bakeryId] ||= []).push({ productId: item.id, quantity: ci.qty, size: ci.size ?? "" });
      }
      const deliveryDate = new Date(details.date + "T12:00:00").toISOString();
      for (const [bakeryId, items] of Object.entries(byBakery)) {
        await api("/orders", {
          method: "POST",
          body: {
            bakeryId, items, deliveryDate, orderType: "standard",
            deliveryMethod: details.method, deliveryAddress: details.method === "delivery" ? details.address : "",
            paymentMethod: payMode === "cash" ? "cash" : "card", ...(cardId && payMode !== "cash" ? { cardId } : {}),
          },
        });
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo crear el pedido.");
      setOrdering(false);
      return;
    } finally {
      if (tempCardId) api(`/users/cards/${tempCardId}`, { method: "DELETE" }).catch(() => {});
    }
    setOrdering(false);
    setCheckoutStep("done");
    setTimeout(() => {
      setCart([]);
      setCardForm({ number: "", name: "", expiry: "", cvv: "" });
      setShowCart(false);
      setCheckoutStep("cart");
      onOrdered?.();
    }, 2500);
  }
  const cardValid = cardForm.number.replace(/\s/g, "").length === 16 && cardForm.name.trim().length > 2 && cardForm.expiry.length === 5 && cardForm.cvv.length >= 3;
  const canPay = payMode === "cash" || payMode.startsWith("card:") || (payMode === "new" && cardValid);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">{bakery ? `Menú de ${bakery.name}` : "Nuestro Menú"}</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">
          {bakery ? "Productos de esta pastelería · " : "Elige tu pastel favorito"}
          {bakery && <button onClick={onClearBakery} className="text-pink-500 font-bold hover:underline">Ver todas las pastelerías</button>}
        </p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => { setCategory(c); setShowPriceFilter(false); }}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${category === c ? "bg-pink-500 text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-pink-200 hover:text-foreground"}`}>
            {c}
          </button>
        ))}
        <button onClick={() => { setCategory("Otros"); setShowPriceFilter(v => !v); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${category === "Otros" ? "bg-pink-500 text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:border-pink-200 hover:text-foreground"}`}>
          <SlidersHorizontal size={13} /> Otros
          <ChevronDown size={12} className={`transition-transform ${showPriceFilter ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Price filter panel */}
      {showPriceFilter && (
        <div className="mb-5 bg-pink-50 border border-pink-200 rounded-2xl p-4 animate-fade-up">
          <div className="text-xs font-bold text-pink-600 mb-3 flex items-center gap-1.5">
            <SlidersHorizontal size={12} /> Filtrar por precio
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Mín $</label>
              <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"
                className="w-24 px-3 py-2 rounded-xl border-2 border-pink-200 bg-white text-sm font-medium focus:outline-none focus:border-pink-400 transition-colors" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Máx $</label>
              <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="1000"
                className="w-24 px-3 py-2 rounded-xl border-2 border-pink-200 bg-white text-sm font-medium focus:outline-none focus:border-pink-400 transition-colors" />
            </div>
            <button onClick={applyPriceFilter}
              className="px-4 py-2 bg-pink-500 text-white text-xs font-bold rounded-xl hover:bg-pink-600 transition-colors">
              Aplicar
            </button>
            <button onClick={clearPriceFilter}
              className="px-4 py-2 border border-pink-300 text-pink-500 text-xs font-bold rounded-xl hover:bg-pink-50 transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      )}
      {!showPriceFilter && <div className="mb-4" />}

      {loadError && <div className="mb-4 bg-pink-50 border border-pink-200 text-pink-600 text-xs font-semibold px-4 py-3 rounded-2xl">{loadError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-card rounded-3xl card-shadow border border-border overflow-hidden flex flex-col">
            <div className="h-40 overflow-hidden bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center shrink-0">
              {!imgErrors[item.id]
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                    onError={() => setImgErrors((e) => ({ ...e, [item.id]: true }))} />
                : <Cake size={56} className="text-pink-300" />}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="font-bold text-foreground">{item.name}</div>
              <div className="text-xs text-muted-foreground mt-1 mb-2 leading-relaxed line-clamp-2">{item.desc}</div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {item.sizes.map((s) => (
                  <button key={s} onClick={() => setSelectedSize((prev) => ({ ...prev, [item.id]: s }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${selectedSize[item.id] === s ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {sizeError === item.id && <p className="text-xs font-semibold text-pink-600 mb-2">Elige una talla antes de agregar.</p>}
              <div className="flex items-center justify-between mt-auto mb-3">
                <span className="font-display text-xl font-semibold text-pink-500">${item.price}</span>
              </div>
              <button onClick={() => addToCart(item.id)}
                className="w-full py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white text-sm font-bold rounded-2xl hover:from-pink-500 hover:to-pink-600 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                <ShoppingCart size={14} />
                Agregar al carrito
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart / Checkout modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl card-shadow p-6 border border-border animate-pop max-h-[90vh] overflow-y-auto">

            {/* STEP: cart */}
            {checkoutStep === "cart" && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                    <ShoppingCart size={20} className="text-pink-500" /> Tu carrito
                  </h2>
                  <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShoppingCart size={40} className="mx-auto mb-3 text-pink-200" />
                    <div className="font-medium">Tu carrito está vacío</div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-5 max-h-56 overflow-y-auto">
                      {cart.map((c) => {
                        const item = findItem(c.id);
                        if (!item) return null;
                        return (
                          <div key={lineKey(c)} className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-pink-100 flex items-center justify-center shrink-0">
                              {!imgErrors[item.id]
                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={() => setImgErrors((e) => ({ ...e, [item.id]: true }))} />
                                : <Cake size={20} className="text-pink-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-foreground truncate">{item.name}</div>
                              <div className="text-xs text-muted-foreground">x{c.qty}{c.size ? ` (${c.size})` : ""} · ${item.price * c.qty}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setCart((prev) => prev.map((ci) => lineKey(ci) === lineKey(c) ? { ...ci, qty: Math.max(1, ci.qty - 1) } : ci))} aria-label="Menos"
                                className="w-6 h-6 rounded-lg bg-border flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-pink-100">−</button>
                              <span className="w-5 text-center text-xs font-bold">{c.qty}</span>
                              <button onClick={() => setCart((prev) => prev.map((ci) => lineKey(ci) === lineKey(c) ? { ...ci, qty: ci.qty + 1 } : ci))}
                                className="w-6 h-6 rounded-lg bg-border flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-pink-100">+</button>
                              <button onClick={() => setCart((prev) => prev.filter((ci) => lineKey(ci) !== lineKey(c)))}
                                aria-label={`Quitar ${item.name} del carrito`} title="Quitar del carrito"
                                className="ml-1 w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 hover:bg-pink-100"><X size={12} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-border pt-4 mb-4 flex justify-between items-center">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="font-display text-xl font-semibold text-pink-500">${cartTotal.toLocaleString()}</span>
                    </div>
                    <button onClick={() => setCheckoutStep("details")}
                      className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                      Continuar
                    </button>
                  </>
                )}
              </>
            )}

            {/* STEP: entrega (fecha, método y dirección) */}
            {checkoutStep === "details" && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setCheckoutStep("cart")} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="font-display text-xl font-semibold flex-1">Entrega</h2>
                  <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Fecha de entrega</label>
                    <input type="date" min={todayStr()} value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Método de entrega</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([["pickup", "Recoger en tienda"], ["delivery", "A domicilio"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setDetails({ ...details, method: val })}
                          className={`py-2.5 rounded-2xl border-2 text-xs font-bold transition-all ${details.method === val ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {details.method === "delivery" && (
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">Dirección de entrega</label>
                      <input type="text" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })}
                        placeholder="Calle, número, colonia"
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium" />
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-4 mb-4 flex justify-between items-center">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-display text-xl font-semibold text-pink-500">${cartTotal.toLocaleString()}</span>
                </div>
                <button onClick={() => setCheckoutStep("payment")} disabled={!detailsValid}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                  <CreditCard size={16} /> Proceder al pago
                </button>
              </>
            )}

            {/* STEP: payment */}
            {checkoutStep === "payment" && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setCheckoutStep("details")} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2 flex-1">
                    <CreditCard size={20} className="text-pink-500" /> Pago
                  </h2>
                  <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                {/* Método de pago: tarjetas guardadas, tarjeta nueva o pago al recibir */}
                <div className="space-y-2 mb-4">
                  {savedCards.map((c) => (
                    <div key={c._id} className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${payMode === `card:${c._id}` ? "border-pink-400 bg-pink-50" : "border-border hover:border-pink-200"}`}
                      onClick={() => setPayMode(`card:${c._id}`)}>
                      <CreditCard size={18} className="text-pink-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground">{c.brand} •••• {c.last4}</div>
                        <div className="text-xs text-muted-foreground">{c.cardHolder} · vence {c.expiryDate}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeSavedCard(c._id); }} className="text-xs font-bold text-muted-foreground hover:text-pink-500">Quitar</button>
                    </div>
                  ))}
                  {([["new", "Usar una tarjeta nueva"], ["cash", details.method === "delivery" ? "Pagar en efectivo al recibir" : "Pagar en el local"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setPayMode(val)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${payMode === val ? "border-pink-400 bg-pink-50 text-pink-600" : "border-border text-muted-foreground hover:border-pink-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {payMode === "new" && (<>
                {/* Card visual */}
                <div className="relative h-40 bg-gradient-to-br from-pink-400 via-pink-500 to-purple-500 rounded-2xl p-5 mb-5 overflow-hidden shadow-lg">
                  <div className="absolute top-3 right-3 opacity-30 w-20 h-20 rounded-full border-8 border-white" />
                  <div className="absolute top-8 right-10 opacity-20 w-16 h-16 rounded-full border-8 border-white" />
                  <div className="text-white/70 text-xs font-bold mb-3 tracking-widest">TARJETA DE CRÉDITO</div>
                  <div className="font-mono text-white text-lg font-bold tracking-widest mb-4">
                    {cardForm.number || "•••• •••• •••• ••••"}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white/60 text-xs">TITULAR</div>
                      <div className="text-white text-sm font-bold uppercase tracking-wide">{cardForm.name || "NOMBRE APELLIDO"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs">VENCE</div>
                      <div className="text-white text-sm font-bold">{cardForm.expiry || "MM/AA"}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Número de tarjeta</label>
                    <div className="relative">
                      <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                        value={cardForm.number}
                        onChange={(e) => setCardForm({ ...cardForm, number: formatCard(e.target.value) })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono font-medium tracking-widest" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">Nombre en la tarjeta</label>
                    <input type="text" placeholder="Como aparece en la tarjeta"
                      value={cardForm.name}
                      onChange={(e) => setCardForm({ ...cardForm, name: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-medium uppercase tracking-wide" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">Vencimiento</label>
                      <input type="text" inputMode="numeric" placeholder="MM/AA"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">CVV</label>
                      <input type="password" inputMode="numeric" placeholder="•••"
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        className="w-full px-4 py-2.5 rounded-2xl border-2 border-border bg-muted focus:outline-none focus:border-pink-400 text-sm font-mono font-medium" />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-4 cursor-pointer">
                  <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} /> Guardar esta tarjeta para próximas compras
                </label>
                </>)}

                <div className="bg-muted rounded-2xl p-3 mb-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total a pagar</span>
                  <span className="font-display text-lg font-semibold text-pink-500">${cartTotal.toLocaleString()}</span>
                </div>

                {loadError && <p className="text-xs font-semibold text-pink-600 mb-3">{loadError}</p>}

                <button onClick={placeOrder} disabled={!canPay || ordering}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
                  <Lock size={15} /> {ordering ? "Procesando..." : "Pagar"} ${cartTotal.toLocaleString()}
                </button>
                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Lock size={10} /> Pago seguro y encriptado
                </p>
              </>
            )}

            {/* STEP: done */}
            {checkoutStep === "done" && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-2">¡Pago exitoso!</h2>
                <p className="text-muted-foreground text-sm font-medium">Tu pedido fue confirmado. Te notificaremos cuando esté listo.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
