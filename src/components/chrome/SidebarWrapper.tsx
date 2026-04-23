"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { navIdFromPath } from "@/lib/nav";
import type { HomelabMeta } from "@/lib/data/types";

export function SidebarWrapper({
  meta,
  containerCount,
  role,
}: {
  meta: HomelabMeta;
  containerCount: number;
  role?: string;
}) {
  const pathname = usePathname() ?? "/";
  const active = navIdFromPath(pathname);
  return <Sidebar active={active} meta={meta} containerCount={containerCount} role={role} />;
}
