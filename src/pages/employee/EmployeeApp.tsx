import { useState } from "react";
import Layout from "../../components/Layout";
import EmployeeHome from "./EmployeeHome";
import EmployeeTasks from "./EmployeeTasks";
import EmployeeCalendar from "./EmployeeCalendar";
import EmployeeProfile from "./EmployeeProfile";
import EmployeePOS from "./EmployeePOS";
import { isCashier } from "../../services/api";

interface Props {
  userName: string;
  onLogout: () => void;
}

export default function EmployeeApp({ userName, onLogout }: Props) {
  const [page, setPage] = useState("calendar");

  const pages: Record<string, React.ReactNode> = {
    home: <EmployeeHome userName={userName} onNavigate={setPage} />,
    // Solo la cajera ve y usa Ventas
    ...(isCashier() ? { pos: <EmployeePOS /> } : {}),
    "my-tasks": <EmployeeTasks />,
    calendar: <EmployeeCalendar onNavigate={setPage} />,
    profile: <EmployeeProfile userName={userName} />,
  };

  return (
    <Layout role="employee" userName={userName} activePage={page} onNavigate={setPage} onLogout={onLogout}>
      {pages[page] || pages["calendar"]}
    </Layout>
  );
}