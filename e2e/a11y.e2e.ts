import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { Lang } from '../lib/i18n';
import { answerScreen, expect, goForward, openApp, pressStart, runToReport, test } from './helpers';

/**
 * AC11. Serious and critical axe violations, WCAG 2.2 A and AA rules.
 *
 * Colour contrast is held to AAA by `lib/a11y/contrast.test.ts` already; axe's
 * AA contrast rule runs here too, as a check on the rendered page.
 */
async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
}

for (const lang of ['de', 'ar'] as Lang[]) {
  test(`welcome, a question and the report have no serious violations (${lang})`, async ({ page }) => {
    await openApp(page, lang);
    expect(await violations(page), 'welcome').toEqual([]);

    await pressStart(page, lang);
    await goForward(page, lang); // situation
    await answerScreen(page);
    expect(await violations(page), 'question').toEqual([]);

    await runToReport(page, lang);
    expect(await violations(page), 'report').toEqual([]);
  });
}
