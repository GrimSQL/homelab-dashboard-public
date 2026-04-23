"use client";
import { useTweaks, type Theme } from "@/lib/tweaks";

const OPTS: ReadonlyArray<{ v: Theme; label: string; title: string }> = [
  { v: "light",  label: "☀", title: "Light"  },
  { v: "dark",   label: "☾", title: "Dark"   },
  { v: "system", label: "◐", title: "System" },
] as const;

export function ThemeToggle() {
  const theme = useTweaks((s) => s.theme);
  const set = useTweaks((s) => s.set);
  return (
    <div className="theme-seg" role="group" aria-label="Theme">
      {OPTS.map((o) => (
        <button
          key={o.v}
          title={o.title}
          className={theme === o.v ? "on" : ""}
          onClick={() => set({ theme: o.v })}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
