import { test, expect } from "@playwright/test";
import path from "node:path";

// These tests only exercise the unauthenticated side of the flow so they can
// run in CI without any seeded accounts. A full login E2E is exercised
// manually against prod during the deploy runbook (see docs/DEPLOY.md).

test("unauthenticated visit to / redirects to /login with a callbackUrl", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/login(\?|$)/, { timeout: 10_000 });
  await expect(page.locator(".login-form")).toBeVisible();
  expect(page.url()).toContain("callbackUrl=%2F");
});

test("unauthenticated visit to a deep page redirects to /login preserving the path", async ({ page }) => {
  await page.goto("/cameras");
  await page.waitForURL(/\/login\?.*callbackUrl/, { timeout: 10_000 });
  expect(page.url()).toContain("callbackUrl=%2Fcameras");
});

test("unauthenticated API request to /api/camera/* returns 401", async ({ request }) => {
  const res = await request.get("/api/camera/cam-a");
  expect(res.status()).toBe(401);
});

test("login page renders with the email and password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("label[for='email']")).toBeVisible();
  await expect(page.locator("label[for='password']")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("invalid credentials surface an inline error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("nobody@example.com");
  await page.locator("#password").fill("wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator(".login-error")).toBeVisible({ timeout: 15_000 });
});

test("valid admin credentials log in end-to-end and render dashboard", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!email || !password, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await page.locator("#email").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.locator(".topbar")).toBeVisible();
  await page.screenshot({
    path: path.resolve(__dirname, "../smoke-output/auth-logged-in.png"),
    fullPage: true,
  });
});
