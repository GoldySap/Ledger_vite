import { NavSide } from "../Nav/Navs";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  return (
    <NavSide>
      <Outlet />
    </NavSide>
  );
}