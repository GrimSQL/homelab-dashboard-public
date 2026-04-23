import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ROUTES = [
  { slug: "overview", path: "/", sectionHeader: false, hasPanel: true },
  { slug: "status", path: "/status", sectionHeader: true, hasPanel: true },
  { slug: "rack", path: "/rack", sectionHeader: true, hasPanel: true },
  { slug: "services", path: "/services", sectionHeader: true, hasPanel: true },
  { slug: "network", path: "/network", sectionHeader: true, hasPanel: true },
  { slug: "metrics", path: "/metrics", sectionHeader: true, hasPanel: true },
  { slug: "backups", path: "/backups", sectionHeader: true, hasPanel: true },
  { slug: "tailscale", path: "/tailscale", sectionHeader: true, hasPanel: true },
  { slug: "adguard", path: "/adguard", sectionHeader: true, hasPanel: true },
  { slug: "bastion", path: "/bastion", sectionHeader: true, hasPanel: true },
  { slug: "hass", path: "/hass", sectionHeader: true, hasPanel: true },
  { slug: "energy", path: "/energy", sectionHeader: true, hasPanel: true },
  { slug: "zigbee", path: "/zigbee", sectionHeader: true, hasPanel: true },
  { slug: "cameras", path: "/cameras", sectionHeader: true, hasPanel: true },
  { slug: "vehicles", path: "/vehicles", sectionHeader: true, hasPanel: true },
  { slug: "projects", path: "/projects", sectionHeader: true, hasPanel: true },
  { slug: "settings", path: "/settings", sectionHeader: true, hasPanel: true },
];

const OUT_DIR = path.resolve(__dirname, "../smoke-output");
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { slug, path: routePath, sectionHeader, hasPanel } of ROUTES) {
  test(`smoke: ${slug}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("requestfailed", (req) =>
      failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`),
    );
    page.on("response", (resp) => {
      if (resp.status() >= 400) {
        failedRequests.push(`${resp.url()} :: ${resp.status()}`);
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(routePath, { waitUntil: "networkidle", timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT_DIR, `${slug}.png`),
      fullPage: true,
    });

    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".topbar")).toBeVisible();
    if (sectionHeader) {
      await expect(page.locator("h2.section").first()).toBeVisible();
    } else {
      // Overview uses a different landmark (hero with big-stat tiles).
      await expect(page.locator(".big-stat").first()).toBeVisible();
    }
    if (hasPanel) {
      await expect(page.locator(".panel").first()).toBeVisible();
    }

    const filteredFailedRequests = failedRequests.filter(
      (r) => !r.includes("favicon.ico"),
    );

    if (consoleErrors.length || pageErrors.length || filteredFailedRequests.length) {
      // eslint-disable-next-line no-console
      console.log(`[${slug}] errors:`, {
        consoleErrors,
        pageErrors,
        failedRequests: filteredFailedRequests,
      });
    }

    expect(
      consoleErrors,
      `console errors on ${slug}: ${consoleErrors.join("\n")}`,
    ).toEqual([]);
    expect(
      pageErrors,
      `page errors on ${slug}: ${pageErrors.join("\n")}`,
    ).toEqual([]);
    expect(
      filteredFailedRequests,
      `failed requests on ${slug}: ${filteredFailedRequests.join("\n")}`,
    ).toEqual([]);
  });
}
