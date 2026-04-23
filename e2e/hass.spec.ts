import { test, expect } from "@playwright/test";

test.describe("hass page", () => {
  test("renders rooms grid with 12 room cards", async ({ page }) => {
    await page.goto("/hass");
    await expect(page.locator(".rooms-grid")).toBeVisible();
    const cards = page.locator(".room-card");
    await expect(cards).toHaveCount(12);
  });

  test("room card shows temperature for rooms with a temp sensor", async ({ page }) => {
    await page.goto("/hass");
    const familyRoom = page.locator(".room-card", { hasText: "Family room" });
    await expect(familyRoom).toContainText(/°C/);
  });
});
