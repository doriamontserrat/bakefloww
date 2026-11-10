import { useState } from "react";
import Layout from "../../components/Layout";
import AdminHome from "./AdminHome";
import AdminBakeries from "./AdminBakeries";
import AdminUsers from "./AdminUsers";
import AdminSubscriptions from "./AdminSubscriptions";
import AdminTransactions from "./AdminTransactions";
import AdminStats from "./AdminStats";
import AdminIncidents from "./AdminIncidents";
import AdminProfile from "./AdminProfile";

interface Props {
  userName: string;
  onLogout: () => void;
}

export default function AdminApp({ userName, onLogout }: Props) {
  const [page, setPage] = useState("home");

  const pages: Record<string, React.ReactNode> = {
    home: <AdminHome onNavigate={setPage} />,
    bakeries: <AdminBakeries />,
    users: <AdminUsers />,
    subscriptions: <AdminSubscriptions />,
    transactions: <AdminTransactions />,
    stats: <AdminStats />,
    incidents: <AdminIncidents />,
    profile: <AdminProfile userName={userName} />,
  };

  return (
    <Layout role="admin" userName={userName} activePage={page} onNavigate={setPage} onLogout={onLogout}>
      {pages[page] || pages["home"]}
    </Layout>
  );
}
