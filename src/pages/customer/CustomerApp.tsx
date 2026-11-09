 import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import Layout from "../../components/Layout";
import CustomerHome from "./CustomerHome";
import CustomerMenu, { type CartLine } from "./CustomerMenu";
import CustomOrder from "./CustomOrder";
import MyOrders from "./MyOrders";
import CustomerNotifications from "./CustomerNotifications";
import CustomerProfile from "./CustomerProfile";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";
import { useOrderCount } from "../../hooks/useOrderCount";

interface Props {
  userName: string;
  onLogout: () => void;
}

// 1. Quitar customRequests y onUpdateRequests de aquí
export default function CustomerApp({ userName, onLogout }: Props) {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const unreadNotifs = useUnreadNotifications();
  
  // Notificaciones sin leer + cotizaciones esperando tu respuesta
  const quotesWaiting = useOrderCount("type=custom&status=awaiting_client");
  const pendingPrice = unreadNotifs + quotesWaiting; 

  function openCart() {
    if (page !== "menu") setPage("menu");
    setShowCart(true);
  }

  const pages: Record<string, React.ReactNode> = {
    home: <CustomerHome userName={userName} onNavigate={setPage} />,
    menu: <CustomerMenu cart={cart} setCart={setCart} showCart={showCart} setShowCart={setShowCart} />,
    // 3. Ya no le pasamos props a CustomOrder (hará su propio fetch igual que CustomRequests)
    "custom-order": <CustomOrder />,
    "my-orders": <MyOrders />,
    notifications: <CustomerNotifications />,
    profile: <CustomerProfile userName={userName} />,
  };

  return (
    <>
      <Layout role="customer" userName={userName} activePage={page} onNavigate={setPage} onLogout={onLogout} notifications={pendingPrice}>
        {pages[page] ?? pages["home"]}
      </Layout>
      {/* Global floating cart button */}
      <button onClick={openCart}
        className="fixed top-3 right-4 z-50 md:top-4 w-11 h-11 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95">
        <ShoppingCart size={18} />
        {cartCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {cartCount}
          </span>
        )}
      </button>
    </>
  );
}