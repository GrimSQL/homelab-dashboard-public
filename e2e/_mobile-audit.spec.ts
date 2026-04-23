import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Mobile responsiveness audit.
 *
 * For each combination of (page, viewport), navigate to the page, wait for
 * idle network, then:
 *   - detect whole-page horizontal overflow (html.scrollWidth > clientWidth)
 *   - find elements that scroll-overflow their container despite
 *     `overflow: visible`
 *   - take a screenshot into smoke-output/mobile-audit/
 *
 * The findings are written as markdown to smoke-output/mobile-audit/report.md
 * and echoed to stdout so CI logs show a quick summary.
 */

type Finding = {
  page: string;
  width: number;
  docOverflow: number; // how much wider than clientWidth (0 means fits)
  elements: string[]; // elements overflowing their container
};

const PAGES = [
  "/",
  "/status",
  "/rack",
  "/services",
  "/network",
  "/metrics",
  "/backups",
  "/tailscale",
  "/adguard",
  "/bastion",
  "/hass",
  "/energy",
  "/zigbee",
  "/cameras",
  "/vehicles",
  "/projects",
  "/settings",
  "/admin/users",
  "/admin/invites",
  "/admin/projects",
];

const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 480, height: 820 },
  { width: 640, height: 900 },
  { width: 768, height: 1024 },
];

const OUT_DIR = path.resolve(__dirname, "..", "smoke-output", "mobile-audit");

// Opt-in suite — only run when RUN_MOBILE_AUDIT=1 is set in the env, since
// the full matrix (20 pages × 4 viewports) takes several minutes.
test.describe("mobile audit", () => {
  test.skip(!process.env.RUN_MOBILE_AUDIT, "set RUN_MOBILE_AUDIT=1 to enable");
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  const findings: Finding[] = [];

  for (const p of PAGES) {
    for (const vp of VIEWPORTS) {
      test(`${p} @ ${vp.width}x${vp.height}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(p, { waitUntil: "domcontentloaded" });
        // Best-effort — some live endpoints never quiet down; cap at 4s.
        await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
          const html = document.documentElement;
          const docOverflow = html.scrollWidth - html.clientWidth;
          const overflowingEls: string[] = [];
          const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
          for (const el of all) {
            const cs = getComputedStyle(el);
            if (cs.overflow !== "visible" && cs.overflowX !== "visible") continue;
            // Skip html/body — we measure doc overflow separately.
            if (el === html || el.tagName === "BODY") continue;
            if (el.scrollWidth > el.clientWidth + 2) {
              const id = el.id ? `#${el.id}` : "";
              const cls = typeof el.className === "string"
                ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).map((c) => `.${c}`).join("")
                : "";
              const label = `${el.tagName.toLowerCase()}${id}${cls}`;
              overflowingEls.push(
                `${label} (sw=${el.scrollWidth} cw=${el.clientWidth})`,
              );
            }
          }
          // Dedupe
          const unique = Array.from(new Set(overflowingEls)).slice(0, 20);
          return { docOverflow, elements: unique };
        });

        const safeName = p === "/" ? "root" : p.replaceAll("/", "_").replace(/^_/, "");
        const screenshot = path.join(OUT_DIR, `${safeName}-${vp.width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });

        findings.push({
          page: p,
          width: vp.width,
          docOverflow: Math.max(0, result.docOverflow),
          elements: result.elements,
        });

        // Don't fail the test — we want to collect everything. Just assert
        // navigation succeeded.
        expect(page.url()).not.toBe("about:blank");
      });
    }
  }

  test.afterAll(() => {
    const lines: string[] = [];
    lines.push("# Mobile audit\n");
    const offenders = findings.filter(
      (f) => f.docOverflow > 0 || f.elements.length > 0,
    );
    lines.push(`Total runs: ${findings.length}`);
    lines.push(`Runs with issues: ${offenders.length}`);
    lines.push("");
    for (const f of offenders) {
      lines.push(`## ${f.page} @ ${f.width}px`);
      if (f.docOverflow > 0) {
        lines.push(`  - **doc overflow**: ${f.docOverflow}px wider than viewport`);
      }
      for (const el of f.elements) {
        lines.push(`  - ${el}`);
      }
      lines.push("");
    }
    const report = lines.join("\n");
    fs.writeFileSync(path.join(OUT_DIR, "report.md"), report);
    console.log(`\n[mobile-audit] ${offenders.length}/${findings.length} runs had issues`);
    console.log(`[mobile-audit] report: ${path.join(OUT_DIR, "report.md")}`);
  });
});
