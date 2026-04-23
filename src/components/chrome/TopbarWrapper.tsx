"use client";
import { usePathname } from "next/navigation";
import { Topbar } from "./Topbar";
import { navIdFromPath } from "@/lib/nav";

export function TopbarWrapper({ user }: { user?: { email: string; role: string } }) {
  const pathname = usePathname() ?? "/";
  const active = navIdFromPath(pathname);
  return <Topbar active={active} user={user} />;
}
