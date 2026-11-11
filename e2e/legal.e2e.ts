import { expect, test } from './helpers';

// AC8
for (const path of ['/impressum', '/datenschutz']) {
  test(`${path} loads`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}
