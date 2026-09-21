/**
 * What an automated accessibility check can and cannot tell you.
 *
 * It cannot tell you whether an eighty-year-old can use this. Nothing here
 * substitutes for watching one person fail to find the Continue button, and
 * that remains the most valuable untested thing about this product.
 *
 * What it does catch is the machine-checkable half: controls with no
 * accessible name, headings that skip a level, form fields with no label,
 * landmarks that are missing or duplicated, colour pairs that fall short of
 * their contrast target. Those are precisely the faults that make a screen
 * reader announce "button" forty times, and they are invisible in a diff.
 *
 * Run against the extremes rather than the defaults: largest text on
 * yellow-on-black at phone width is the configuration the people this exists
 * for actually use, and it is where layout breaks.
 *
 * Usage:
 *   npm run build && npm start &
 *   npm run test:a11y
 */

import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? `  ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

/** Display settings written before first paint, as the real app stores them. */
const settings = (textSize, theme) => ({
  name: `${textSize} / ${theme}`,
  init: `localStorage.setItem('anspruch.settings.v1', ${JSON.stringify(
    JSON.stringify({ textSize, theme, lang: 'de', pace: 'one', answerMode: 'tap' }),
  )})`,
});

const PROFILES = [
  settings('normal', 'light'),
  settings('largest', 'contrast-dark'),
  settings('largest', 'contrast-light'),
];

async function audit(page, label) {
  await page.addScriptTag({ path: AXE_PATH });
  const result = await page.evaluate(async () =>
    await window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    }),
  );
  const serious = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  const minor = result.violations.filter((v) => !['serious', 'critical'].includes(v.impact));

  check(
    `${label}: no serious or critical violations`,
    serious.length === 0,
    serious.map((v) => `${v.id} ×${v.nodes.length}`).join(', '),
  );
  if (minor.length) {
    console.log(`         (minor: ${minor.map((v) => `${v.id} ×${v.nodes.length}`).join(', ')})`);
  }
  return result.violations;
}

async function main() {
  const res = await fetch(BASE).catch(() => null);
  if (!res?.ok) {
    console.error(`\n  No server at ${BASE}.\n  Run:  npm run build && npm start\n`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: EXECUTABLE });

  for (const profile of PROFILES) {
    console.log(`\n  --- ${profile.name} ---`);
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.addInitScript(profile.init);
    const page = await ctx.newPage();

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await audit(page, 'welcome');

    // No sideways scrolling. This is the single most common way a page fails a
    // reader at the largest text size: the layout does not break, it just
    // pushes half the words past the right edge where nobody looks for them.
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      view: document.documentElement.clientWidth,
    }));
    check(
      `welcome: no horizontal overflow at 360px`,
      overflow.doc <= overflow.view + 1,
      `${overflow.doc}px content in ${overflow.view}px`,
    );

    // Into the questions, where the text scale actually bites.
    const start = page.getByRole('button', { name: /Los geht|Starten|Beginnen|Weiter/i }).first();
    if (await start.count()) await start.click();
    await page.waitForTimeout(400);
    await audit(page, 'question');

    const q = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      view: document.documentElement.clientWidth,
    }));
    check(
      `question: no horizontal overflow at 360px`,
      q.doc <= q.view + 1,
      `${q.doc}px content in ${q.view}px`,
    );

    // The primary control must stay on screen and be large enough to hit.
    const next = page.locator('nav').getByRole('button').last();
    if (await next.count()) {
      const box = await next.boundingBox();
      check(
        `question: the Continue control is visible and ≥44px tall`,
        Boolean(box) && box.height >= 44 && box.y >= 0,
        box ? `${Math.round(box.width)}×${Math.round(box.height)} at y=${Math.round(box.y)}` : 'not found',
      );
    } else {
      check('question: the Continue control exists', false);
    }

    await ctx.close();
  }

  // Legal pages: plain documents, and the easiest thing in the project to
  // regress, because nobody looks at them again after they are written.
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await ctx.newPage();
    console.log('\n  --- legal pages ---');
    for (const path of ['/impressum', '/datenschutz']) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await audit(page, path);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main();
