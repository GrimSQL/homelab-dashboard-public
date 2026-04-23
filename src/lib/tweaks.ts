import { create, type StoreApi, type UseBoundStore } from "zustand";

export const ACCENT_HUES = {
  amber:   72,
  orange:  50,
  red:     27,
  pink:    350,
  magenta: 340,
  purple:  290,
  blue:    250,
  cyan:    220,
  lime:    140,
  emerald: 155,
} as const;
export type Accent = keyof typeof ACCENT_HUES;
export type Theme = "dark" | "light" | "system";
export type Density = "cozy" | "compact";
export type Mono =
  | "JetBrains Mono"
  | "IBM Plex Mono"
  | "Geist Mono"
  | "Fira Code"
  | "Space Mono"
  | "Source Code Pro";

export type Tweaks = { theme: Theme; accent: Accent; density: Density; mono: Mono };

export const TWEAK_DEFAULTS: Tweaks = {
  theme: "dark",
  accent: "amber",
  density: "cozy",
  mono: "JetBrains Mono",
};

const STORAGE_KEY = "ui-tweaks";

function applyToDOM(t: Tweaks) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light", "theme-system");
  root.classList.add(`theme-${t.theme}`);
  root.style.setProperty("--accent-hue", String(ACCENT_HUES[t.accent]));
  root.style.setProperty("--mono", `"${t.mono}"`);
  root.style.fontSize = t.density === "cozy" ? "14px" : "13px";
}

type State = Tweaks & {
  set: (patch: Partial<Tweaks>) => void;
  reset: () => void;
  hydrate: () => void;
};

type TweaksStoreApi = Omit<StoreApi<State>, "setState"> & {
  setState: {
    (partial: Partial<State> | ((s: State) => Partial<State> | State)): void;
    (state: State | Tweaks | ((s: State) => State), replace: true): void;
  };
};
type TweaksHook = UseBoundStore<StoreApi<State>> & TweaksStoreApi;

const _useTweaksRaw = create<State>((setFn, get) => {
  const actions = {
    set: (patch: Partial<Tweaks>) => {
      const next = { ...get(), ...patch } as Tweaks;
      setFn(next);
      applyToDOM(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    },
    reset: () => get().set(TWEAK_DEFAULTS),
    hydrate: () => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = { ...TWEAK_DEFAULTS, ...JSON.parse(raw) } as Tweaks;
          setFn(parsed);
          applyToDOM(parsed);
        } else {
          applyToDOM(get());
        }
      } catch {
        applyToDOM(get());
      }
    },
  };
  return { ...TWEAK_DEFAULTS, ...actions };
});

// Wrap setState so that `replace: true` with a narrow state still preserves actions,
// and widen its signature so callers can reset with just `TWEAK_DEFAULTS`.
const _origSetState = _useTweaksRaw.setState;
_useTweaksRaw.setState = ((partial: unknown, replace?: boolean) => {
  if (replace === true && typeof partial === "object" && partial !== null) {
    const current = _useTweaksRaw.getState();
    const merged = {
      set: current.set,
      reset: current.reset,
      hydrate: current.hydrate,
      ...(partial as object),
    };
    return _origSetState(merged as State, true);
  }
  return _origSetState(partial as Partial<State>, replace as false | undefined);
}) as typeof _useTweaksRaw.setState;

export const useTweaks = _useTweaksRaw as TweaksHook;
