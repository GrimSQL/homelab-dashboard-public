"use client";
import { signOut } from "next-auth/react";
import { useClock } from "@/lib/useClock";
import { PAGE_LABELS } from "@/lib/nav";
import { useMobileNav } from "@/lib/mobile-nav";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ active, user }: { active: string; user?: { email: string; role: string } }) {
  const { dateStr, timeStr } = useClock();
  const toggleNav = useMobileNav((s) => s.toggleNav);
  return (
    <header className="topbar">
      <button
        type="button"
        className="hamburger"
        aria-label="Toggle navigation"
        onClick={toggleNav}
      >
        <span /><span /><span />
      </button>
      <div className="crumbs">
        <span>homelab.example.com</span>
        <span className="sep">/</span>
        <b>{PAGE_LABELS[active] ?? active}</b>
      </div>
      <div className="topbar-right">
        <span>{dateStr}</span>
        <span className="pill"><span className="ledot" /> ONLINE · {timeStr}</span>
        <ThemeToggle />
        {user && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="logout-btn"
            title={user.email}
          >
            signout
          </button>
        )}
      </div>
    </header>
  );
}
