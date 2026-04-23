import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";

/**
 * Global Playwright setup — authenticate once with the dev admin (seeded
 * from .env.local's ADMIN_EMAIL / ADMIN_PASSWORD on the first request to
 * the dashboard) and save the resulting session cookie to a storage state
 * file. All projects consuming this state reuse the login automatically.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL || "http://localhost:3000";
  const email = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.warn("[e2e] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping authenticated state");
    return;
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Visit /login so that the server seeds the admin user (authorize() runs
  // bootstrapAdmin() on the first login attempt).
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });

  // Use the Auth.js REST flow directly — more reliable than driving the form
  // through Playwright, which otherwise has to wait for the client nav.
  const csrfResp = await page.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = (await csrfResp.json()) as { csrfToken: string };
  const form = new URLSearchParams();
  form.set("email", email);
  form.set("password", password);
  form.set("csrfToken", csrfToken);
  form.set("callbackUrl", `${baseURL}/`);
  const loginResp = await page.request.post(`${baseURL}/api/auth/callback/credentials`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: form.toString(),
    maxRedirects: 0,
  });
  if (loginResp.status() !== 302 && loginResp.status() !== 303) {
    throw new Error(`[e2e] login failed (HTTP ${loginResp.status()}): ${await loginResp.text()}`);
  }

  const stateFile = path.resolve(__dirname, ".auth-state.json");
  await ctx.storageState({ path: stateFile });
  await browser.close();
}
