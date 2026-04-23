import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Final mobile screenshot deliverable — three primary pages at three phone
 * viewports, saved to smoke-output/mobile-final/.
 */

const PAGES = ["/", "/hass", "/services"];
const VIEWPORTS = [
  { width: 360, height: 780 },
  { width: 480, height: 820 },
  { width: 640, height: 900 },
];

const OUT_DIR = path.resolve(__dirname, "..", "smoke-output", "mobile-final");

// Opt-in — only run when RUN_MOBILE_FINAL=1 is set.
test.describe("mobile final screenshots", () => {
  test.skip(!process.env.RUN_MOBILE_FINAL, "set RUN_MOBILE_FINAL=1 to enable");
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const p of PAGES) {
    for (const vp of VIEWPORTS) {
      test(`${p} @ ${vp.width}x${vp.height}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(p, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(300);
        const safeName = p === "/" ? "root" : p.replaceAll("/", "_").replace(/^_/, "");
        await page.screenshot({
          path: path.join(OUT_DIR, `${safeName}-${vp.width}.png`),
          fullPage: true,
        });
        expect(page.url()).not.toBe("about:blank");
      });
    }
  }
});
