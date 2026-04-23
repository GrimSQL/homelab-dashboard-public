// Settings page — theme, accent, density, mono pickers wired to the tweaks store.
// Ported from design_handoff/src/App.jsx (SettingsPage).
"use client";
import { Panel, SectionHeader } from "@/components/primitives";
import { ACCENT_HUES, type Accent, type Density, type Mono, type Theme, useTweaks } from "@/lib/tweaks";

const THEMES: Theme[] = ["light", "dark", "system"];
const DENSITIES: Density[] = ["cozy", "compact"];
const MONOS: Mono[] = ["JetBrains Mono", "IBM Plex Mono", "Geist Mono", "Fira Code", "Space Mono", "Source Code Pro"];
const ACCENTS = Object.keys(ACCENT_HUES) as Accent[];

export function SettingsPage() {
  const theme = useTweaks(s => s.theme);
  const accent = useTweaks(s => s.accent);
  const density = useTweaks(s => s.density);
  const mono = useTweaks(s => s.mono);
  const set = useTweaks(s => s.set);
  const reset = useTweaks(s => s.reset);

  return (
    <section className="page anchor" id="settings">
      <SectionHeader num="09" title="Settings" sub="Visual preferences. Stored locally in your browser." />

      <Panel title="Appearance" meta="theme · accent · density · font">
        <div className="settings-grid">
          <div className="settings-row">
            <div className="k">
              <div className="caps">Theme</div>
              <div className="hint">light, dark, or follow system preference</div>
            </div>
            <div className="v">
              <div className="seg-lg">
                {THEMES.map(k => (
                  <button key={k} className={theme === k ? "on" : ""} onClick={() => set({ theme: k })}>{k}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div className="k">
              <div className="caps">Accent color</div>
              <div className="hint">used for active nav, links, status highlights</div>
            </div>
            <div className="v">
              <div className="seg-lg">
                {ACCENTS.map(k => (
                  <button key={k} className={accent === k ? "on" : ""} onClick={() => set({ accent: k })}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: `oklch(0.75 0.15 ${ACCENT_HUES[k]})`, marginRight: 6, verticalAlign: "middle" }} />
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div className="k">
              <div className="caps">Density</div>
              <div className="hint">cozy = roomier rows, compact = tighter</div>
            </div>
            <div className="v">
              <div className="seg-lg">
                {DENSITIES.map(k => (
                  <button key={k} className={density === k ? "on" : ""} onClick={() => set({ density: k })}>{k}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div className="k">
              <div className="caps">Monospace font</div>
              <div className="hint">used for code, tables, terminal-like UI</div>
            </div>
            <div className="v">
              <div className="seg-lg">
                {MONOS.map(k => (
                  <button key={k} className={mono === k ? "on" : ""} onClick={() => set({ mono: k })}>{k}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="About" meta="build info">
        <div className="settings-grid">
          <div className="settings-row"><div className="k"><div className="caps">Version</div></div><div className="v mono">homelab-dashboard v0.3</div></div>
          <div className="settings-row"><div className="k"><div className="caps">Storage</div></div><div className="v mono">localStorage · no cookies, no tracking</div></div>
          <div className="settings-row">
            <div className="k"><div className="caps">Reset</div></div>
            <div className="v">
              <button className="seg-lg" style={{ padding: "6px 14px", cursor: "pointer" }} onClick={() => reset()}>Restore defaults</button>
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}
