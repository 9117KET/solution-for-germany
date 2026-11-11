import { test as base, expect, type Page } from '@playwright/test';
import { LANGUAGES, type Lang } from '../lib/i18n';
import { translate, type UiKey } from '../lib/i18n/strings';

/**
 * Interface copy from the app's own string table.
 *
 * Tests find controls by the text a person sees, but take that text from
 * `lib/i18n/strings.ts` rather than repeating it, so a wording change moves the
 * app and its tests together.
 */
export function T(key: UiKey, lang: Lang = 'de', vars?: Record<string, string | number>) {
  return translate(key, lang, vars);
}

/** A string with `{placeholders}` as a regular expression; each placeholder matches anything. */
export function pattern(key: UiKey, lang: Lang = 'de') {
  const escaped = translate(key, lang).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\\\{\w+\\\}/g, '.+?'));
}

/** Where the saved intake lives on the device (`lib/intake/session.ts`). */
export const SESSION_KEY = 'anspruch.session.v1';

export function savedSession(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY);
}

/**
 * Every test fails on an uncaught error or a console error on any screen.
 * A broken screen that still renders something is exactly what unit tests miss.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text()}`);
      });
      await use(errors);
      expect(errors, 'no console errors or uncaught exceptions').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Open the app fresh, pick the interface language, and press Start. */
export async function start(page: Page, lang: Lang = 'de') {
  await page.goto('/');
  if (lang !== 'de') await chooseLanguage(page, lang);
  await page.getByRole('button', { name: T('start', lang), exact: true }).click();
}

export async function chooseLanguage(page: Page, lang: Lang) {
  const name = LANGUAGES.find((l) => l.id === lang)!.nativeName;
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

/** The button that moves on: "Weiter" on a question, "Ergebnis anzeigen" on the last one. */
export function forward(page: Page, lang: Lang = 'de') {
  const names = [T('next', lang), T('seeResult', lang)].map((s) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  // The label is "{text} →" (`app/page.tsx`). Anchoring on the arrow matters: in
  // Arabic "see my result" is a prefix of "show me the result now".
  return page.getByRole('button', { name: new RegExp(`^(${names.join('|')}) →$`) });
}

/** The report is open when its PDF button is. */
export function reportMarker(page: Page, lang: Lang = 'de') {
  return page.getByRole('button', { name: T('downloadPdf', lang) });
}

/**
 * Answer every unanswered radio group on the screen.
 *
 * The fixture answer is the last option: "Nein" on a yes/no screening question,
 * the most dependent level on a scale. It is a fixture, not a claim about any
 * household; it is used because it is deterministic and settles the grade.
 */
export async function answerScreen(page: Page) {
  const groups = page.locator('main fieldset');
  const n = await groups.count();
  for (let i = 0; i < n; i++) {
    const radios = groups.nth(i).getByRole('radio');
    if ((await radios.count()) === 0) continue;
    const checked = await groups.nth(i).locator('input[type=radio]:checked').count();
    if (checked === 0) await radios.last().check();
  }
}

/** Tailwind's `sm` breakpoint: below it the question nav is pinned to the bottom. */
const SM = 640;

/**
 * Press forward once. On a phone, first check it can be reached without
 * scrolling: the nav is pinned to the bottom of the screen there (`app/page.tsx`),
 * and this is the check that it stays pinned. On wider screens the nav sits at
 * the end of the page by design, so no such check applies.
 */
export async function goForward(page: Page, lang: Lang = 'de') {
  const button = forward(page, lang);
  const width = page.viewportSize()?.width ?? Infinity;
  if (width < SM) await expect(button).toBeInViewport();
  await button.click();
}

/** From the situation screen, answer and continue until the report shows. Returns screens passed. */
export async function runToReport(page: Page, lang: Lang = 'de') {
  for (let screens = 0; screens < 80; screens++) {
    if (await reportMarker(page, lang).isVisible()) return screens;
    await answerScreen(page);
    await goForward(page, lang);
  }
  throw new Error('the report did not appear within 80 screens');
}
