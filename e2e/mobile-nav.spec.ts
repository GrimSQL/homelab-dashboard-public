import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(__dirname, "../smoke-output");
fs.mkdirSync(OUT_DIR, { recursive: true });

test.describe("mobile hamburger nav", () => {
  test.skip(
    () => !process.env.ADMIN_EMAIL && !process.env.E2E_ADMIN_EMAIL,
    "admin creds not provided",
  );

  test("hamburger opens drawer, link closes it", async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto("/");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar).not.toHaveClass(/open/);

    await page.getByRole("button", { name: /toggle navigation/i }).click();
    await expect(sidebar).toHaveClass(/open/);
    await expect(page.locator(".sidebar-backdrop.open")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "mobile-drawer-open.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: /services/i }).first().click();
    await page.waitForURL("**/services");
    await expect(sidebar).not.toHaveClass(/open/);
  });

  test("backdrop click closes drawer", async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: /toggle navigation/i }).click();
    await expect(page.locator(".sidebar")).toHaveClass(/open/);
    await page.locator(".sidebar-backdrop").click({ position: { x: 350, y: 400 } });
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  });

  test("escape key closes drawer", async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: /toggle navigation/i }).click();
    await expect(page.locator(".sidebar")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  });
});
