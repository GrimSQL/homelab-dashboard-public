import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end invite redemption flow.
 *
 * This test runs as part of the "chromium" project, so it would normally
 * inherit the pre-authenticated admin storageState — but the stored state
 * from global-setup doesn't always carry a live session cookie (e.g. when
 * the initial boot happened before bootstrapAdmin completed). To be
 * robust, every test that needs admin API access logs in explicitly at
 * the start via Auth.js's credentials callback.
 *
 * The actual redemption uses a fresh (unauthed) browser context.
 *
 * Cleanup: the test always attempts to delete the throwaway user it
 * creates — important when the suite is pointed at prod via E2E_BASE_URL.
 */

async function adminLogin(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("admin credentials missing (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)");
  }
  // Hit /login once so the server sets the CSRF cookie.
  await page.goto("/login");
  const csrfResp = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrfResp.json()) as { csrfToken: string };
  const form = new URLSearchParams();
  form.set("email", email);
  form.set("password", password);
  form.set("csrfToken", csrfToken);
  form.set("callbackUrl", "/");
  const loginResp = await page.request.post("/api/auth/callback/credentials", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: form.toString(),
    maxRedirects: 0,
  });
  if (loginResp.status() !== 302 && loginResp.status() !== 303) {
    throw new Error(`admin login failed (HTTP ${loginResp.status()}): ${await loginResp.text()}`);
  }
}

const TS = Date.now();
const RANDOM = Math.random().toString(36).slice(2, 8);
const TEST_EMAIL = `invite-test-${TS}-${RANDOM}@example.com`;
const TEST_PASSWORD = "Inv1te-Test-Pass!word"; // meets policy

async function adminGetUserId(page: Page, email: string): Promise<string | null> {
  const res = await page.request.get("/api/admin/users");
  if (!res.ok()) return null;
  const body = (await res.json()) as { users?: Array<{ id: string; email: string }> };
  return body.users?.find((u) => u.email === email)?.id ?? null;
}

async function adminDeleteUserByEmail(page: Page, email: string): Promise<void> {
  const id = await adminGetUserId(page, email);
  if (!id) return;
  await page.request.delete(`/api/admin/users/${id}`);
}

test.describe("invite redemption", () => {
  test("admin generates an invite, new user redeems it and lands on the dashboard", async ({
    page,
    browser,
  }) => {
    await adminLogin(page);

    // Belt-and-suspenders: if a previous run left a stale user behind, nuke it first.
    await adminDeleteUserByEmail(page, TEST_EMAIL).catch(() => {});

    try {

    // 1. Admin generates an invite via the API (cleaner than driving the form).
    const createRes = await page.request.post("/api/admin/invites", {
      data: { role: "user", note: `e2e ${TS}`, expiresInDays: 1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const { invite } = (await createRes.json()) as {
      invite: { id: string; code: string };
    };
    expect(invite.code).toMatch(/^[a-f0-9]{32}$/);
    const inviteId = invite.id;
    const inviteCode = invite.code;

    // 2. Admin verifies the invite appears in /admin/invites.
    await page.goto("/admin/invites");
    await expect(page.locator(`text=${inviteCode.slice(0, 8)}`)).toBeVisible({ timeout: 10_000 });

    // 3. Open a *fresh* (unauthenticated) browser context to redeem.
    const freshCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const freshPage = await freshCtx.newPage();
      await freshPage.goto(`/signup?code=${inviteCode}`);

      // The form should render (not the "invalid invite" banner).
      await expect(freshPage.locator("#email")).toBeVisible({ timeout: 10_000 });
      await expect(freshPage.locator("#name")).toBeVisible();
      await expect(freshPage.locator("#password")).toBeVisible();

      await freshPage.locator("#email").fill(TEST_EMAIL);
      await freshPage.locator("#name").fill("Invite Test");
      await freshPage.locator("#password").fill(TEST_PASSWORD);
      await freshPage.getByRole("button", { name: /create account/i }).click();

      // After signup + auto-signin we should land on "/".
      await freshPage.waitForURL((u) => u.pathname === "/", { timeout: 20_000 });
      await expect(freshPage.locator(".sidebar")).toBeVisible();
      await expect(freshPage.locator(".topbar")).toBeVisible();

      // 4. The invite should now show as used in the admin table.
      await page.reload();
      await expect(page.locator(`text=used by ${TEST_EMAIL}`).first()).toBeVisible({
        timeout: 10_000,
      });

      // 5. Redeeming the same URL a second time should fail.
      const secondCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      try {
        const secondPage = await secondCtx.newPage();
        await secondPage.goto(`/signup?code=${inviteCode}`);
        // Used invites render the error banner, not the form.
        await expect(secondPage.locator(".login-error")).toBeVisible({ timeout: 10_000 });
        await expect(secondPage.locator("#email")).toHaveCount(0);
      } finally {
        await secondCtx.close();
      }

      // 6. Verify the test user can also log in with the chosen password.
      const verifyCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      try {
        const csrf = await verifyCtx
          .request.get("/api/auth/csrf")
          .then((r) => r.json()) as { csrfToken: string };
        const form = new URLSearchParams();
        form.set("email", TEST_EMAIL);
        form.set("password", TEST_PASSWORD);
        form.set("csrfToken", csrf.csrfToken);
        form.set("callbackUrl", "/");
        const loginResp = await verifyCtx.request.post("/api/auth/callback/credentials", {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: form.toString(),
          maxRedirects: 0,
        });
        // Auth.js returns 302/303 on success, not 200.
        expect([302, 303]).toContain(loginResp.status());
      } finally {
        await verifyCtx.close();
      }
    } finally {
      await freshCtx.close();
    }

    // (inviteId is the admin-visible id; retained here in case a future
    // test needs to inspect the invite row post-redemption.)
    expect(inviteId).toBeTruthy();

    } finally {
      // Cleanup: delete the throwaway test user so we don't leave it in prod.
      await adminDeleteUserByEmail(page, TEST_EMAIL).catch(() => {});
    }
  });

  test("signup page without a code shows the invalid banner", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const p = await ctx.newPage();
      await p.goto("/signup");
      await expect(p.locator(".login-error")).toBeVisible({ timeout: 10_000 });
      await expect(p.locator("#email")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });

  test("signup page with a bogus code shows the invalid banner", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const p = await ctx.newPage();
      await p.goto("/signup?code=not-a-real-code");
      await expect(p.locator(".login-error")).toBeVisible({ timeout: 10_000 });
      await expect(p.locator("#email")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });
});
