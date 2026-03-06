import { Outlet } from "react-router-dom";
import { NavSide } from "../Nav/Navs";

export function DashboardLayout() {
  return (
    <NavSide>
      <Outlet />
    </NavSide>
  );
}