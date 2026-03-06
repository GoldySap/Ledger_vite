import { Outlet } from "react-router-dom";
import { NavTop } from "../Nav/Navs";

export function HomeLayout() {
  return (
    <>
      <NavTop />
      <Outlet />
    </>
  );
}