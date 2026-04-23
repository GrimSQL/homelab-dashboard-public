"use client";
import Link from "next/link";
import { useEffect } from "react";
import { navSectionsFor, pathForNavId } from "@/lib/nav";
import { useMobileNav } from "@/lib/mobile-nav";
import type { HomelabMeta } from "@/lib/data/types";

export type SidebarProps = {
  active: string;
  meta: HomelabMeta;
  containerCount: number;
  role?: string;
};

export function Sidebar({ active, meta, containerCount, role }: SidebarProps) {
  const since = new Date(meta.uptimeSinceISO);
  const days = Math.floor((Date.now() - since.getTime()) / 86_400_000);
  const gen = meta.generatedAt ? new Date(meta.generatedAt) : null;
  const sections = navSectionsFor(role);

  const { open, closeNav } = useMobileNav();

  useEffect(() => {
    if (!open) return;

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNav();
    };
    document.addEventListener("keydown", onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeNav]);

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "open" : ""}`}
        onClick={closeNav}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-name"><b>homelab</b><span>.example</span></div>
        </div>

        <div className="nav">
          {sections.map((sec) => (
            <div key={sec.label}>
              <div className="caps nav-label">{sec.label}</div>
              {sec.items.map((item) => (
                <Link
                  key={item.id}
                  href={pathForNavId(item.id)}
                  className={active === item.id ? "active" : ""}
                  onClick={closeNav}
                >
                  <span className="dot" />
                  <span className="icon">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-foot">
          <div className="row"><span>OPERATOR</span><span>{meta.owner}</span></div>
          <div className="row"><span>HOME UPTIME</span><span>{days} d</span></div>
          <div className="row"><span>SERVICES</span><span>{containerCount}</span></div>
          <div className="row"><span>GENERATED</span><span>{gen ? gen.toISOString().slice(0, 10) : "—"}</span></div>
        </div>
      </aside>
    </>
  );
}
