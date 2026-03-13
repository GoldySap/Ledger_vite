import { Outlet } from "react-router-dom";
import { NavSide, AdminNavSide } from "../Nav/Navs";

export function DashboardLayout() {
  return (
    <NavSide>
      <Outlet />
    </NavSide>
  );
}

export function AdminDashboardLayout() {
  return (
    <AdminNavSide>
      <Outlet />
    </AdminNavSide>
  );
}