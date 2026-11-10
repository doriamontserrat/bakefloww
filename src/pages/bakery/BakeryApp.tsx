import { useState } from "react";
import Layout from "../../components/Layout";
import BakeryHome from "./BakeryHome";
import MenuManagement from "./MenuManagement";
import OrdersCalendar from "./OrdersCalendar";
import OrdersManagement from "./OrdersManagement";
import CustomRequests from "./CustomRequests";
import EmployeeManagement from "./EmployeeManagement";
import Finances from "./Finances";
import SubscriptionPage from "./SubscriptionPage";
import BakeryIncidents from "./BakeryIncidents";
import BakeryProfile from "./BakeryProfile";
import BakeryCategories from "../admin/AdminCategories";
import BakeryPOS from "./BakeryPOS";
import Reports from "./Reports";
import { hasFeature } from "../../services/api";
import { useOrderCount } from "../../hooks/useOrderCount";

interface Props {
  userName: string;
  onLogout: () => void;
}

// 1. Quitamos customRequests y onUpdateRequests de los parámetros
export default function BakeryApp({ userName, onLogout }: Props) {
  const [page, setPage] = useState("home");

  const pages: Record<string, React.ReactNode> = {
    home: <BakeryHome userName={userName} onNavigate={setPage} />,
    pos: <BakeryPOS />,
    "menu-mgmt": <MenuManagement />,
    "orders-cal": <OrdersCalendar />,
    "orders-mgmt": <OrdersManagement />,
    "custom-requests": <CustomRequests />,
    employees: <EmployeeManagement />,
    // Finanzas y Reportes no están en el menú si el plan no los incluye; si se llega por otro lado, se vuelve al inicio
    ...(hasFeature("finance") ? { finances: <Finances /> } : {}),
    ...(hasFeature("stats") ? { reports: <Reports onNavigate={setPage} /> } : {}),
    subscription: <SubscriptionPage />,
    incidents: <BakeryIncidents />,
    categories: <BakeryCategories />,
    profile: <BakeryProfile userName={userName} onNavigate={setPage} />,
  };

  // Solicitudes personalizadas pendientes de cotizar
  const pendingCount = useOrderCount("type=custom&status=pending_quote"); 

  return (
    <Layout role="bakery" userName={userName} activePage={page} onNavigate={setPage} onLogout={onLogout} notifications={pendingCount}>
      {pages[page] ?? pages["home"]}
    </Layout>
  );
}