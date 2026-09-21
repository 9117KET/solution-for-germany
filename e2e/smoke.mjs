/**
 * What the unit tests structurally cannot see.
 *
 * `vitest` covers the arithmetic, the bounds and the copy table. None of it
 * renders a page, so none of it can tell you that the Impressum is reachable,
 * that the voice disclosure actually appears when someone picks voice, or that
 * the report prints the date the figures were checked. Those three are exactly
 * the claims this project makes to the people it is asking to trust it, and
 * until this file they were verified by reading the diff.
 *
 * Deliberately plain: `playwright` driving a browser, no test runner, no config
 * file. It asserts a handful of things that would embarrass the project if they
 * broke, and it is meant to stay small enough that nobody is tempted to skip it.
 *
 * Usage:
 *   npm run build && npm start &     # serve a production build on :3000
 *   npm run test:e2e
 *
 * The browser: Playwright's own by default. Set CHROMIUM_PATH to override,
 * which is what a sandbox with a preinstalled Chromium wants.
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import zlib from 'node:zlib';

/**
 * The text out of a PDF, without a parser dependency.
 *
 * Enough for assertions, not a general extractor: it pulls the literals out of
 * the content streams, inflating them first where they are compressed. If this
 * ever stops finding text that is plainly in the document, reach for a real
 * parser rather than making the regex cleverer.
 */
function pdfText(bytes) {
  const chunks = [];
  const raw = bytes.toString('latin1');

  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const body = Buffer.from(m[1], 'latin1');
    let out = body;
    try {
      out = zlib.inflateSync(body);
    } catch {
      /* not compressed; use as-is */
    }
    chunks.push(out.toString('latin1'));
  }

  const content = chunks.join('\n') || raw;
  const pieces = [];
  for (const m of content.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
    pieces.push(
      m[0]
        .slice(1, -1)
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))),
    );
  }
  // Already latin1-decoded above: jsPDF's standard fonts write WinAnsi, whose
  // printable range matches ISO-8859-1 for everything this document uses.
  // Re-encoding through utf8 here is what turned every ä into a replacement
  // character and hid the § signs the assertions look for.
  return pieces.join(' ');
}

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? `  ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
};

/**
 * A SpeechRecognition complete enough for the app's own code paths.
 *
 * Headless Chromium ships no Web Speech API, so voice mode is never offered and
 * the disclosure under test is unreachable. This stubs the *capability check*
 * only — the notice, its wording and the condition that shows it are the real
 * ones. A bare `function(){}` is not enough: the app calls `abort()`.
 */
const SPEECH_STUB = () => {
  class R {
    constructor() {
      this.lang = '';
      this.continuous = false;
      this.interimResults = false;
    }
    start() {}
    stop() {}
    abort() {}
    addEventListener() {}
    removeEventListener() {}
  }
  window.SpeechRecognition = R;
  window.webkitSpeechRecognition = R;
};

async function main() {
  const res = await fetch(BASE).catch(() => null);
  if (!res?.ok) {
    console.error(`\n  No server at ${BASE}.\n  Run:  npm run build && npm start\n`);
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath: EXECUTABLE });

  const fresh = async (init) => {
    const ctx = await browser.newContext();
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    return { ctx, page, errors };
  };

  // ------------------------------------------------------------ legal pages
  {
    const { ctx, page, errors } = await fresh();
    await page.goto(`${BASE}/impressum`, { waitUntil: 'networkidle' });
    const imp = await page.textContent('body');
    check('/impressum carries a ladungsfähige Anschrift', /\d{5}\s+Bremen/.test(imp) && /straße|strasse/i.test(imp));
    check('/impressum names the licence', imp.includes('AGPL'));

    await page.goto(`${BASE}/datenschutz`, { waitUntil: 'networkidle' });
    const ds = await page.textContent('body');
    check('/datenschutz lists both storage keys',
      ds.includes('anspruch.settings.v1') && ds.includes('anspruch.session.v1'));
    check('/datenschutz discloses the speech upload',
      /Chrome und Edge/.test(ds) && /Tonaufnahme/.test(ds));
    check('legal pages raise no page errors', errors.length === 0, errors[0] ?? '');
    await ctx.close();
  }

  // --------------------------------------------- the voice disclosure, in situ
  {
    const { ctx, page, errors } = await fresh(SPEECH_STUB);
    await page.goto(BASE, { waitUntil: 'networkidle' });

    check('footer reaches both legal pages from the app',
      (await page.locator('footer a[href="/impressum"]').count()) === 1 &&
        (await page.locator('footer a[href="/datenschutz"]').count()) === 1);

    check('no voice notice before voice is chosen',
      !(await page.textContent('body')).includes('Hinweis zur Spracheingabe'));

    await page.getByText('Ich spreche die Antwort', { exact: false }).first().click();
    await page.waitForTimeout(300);
    const on = await page.textContent('body');
    check('voice notice appears when voice is chosen', on.includes('Hinweis zur Spracheingabe'));
    check('and names the external processing', /Servern ihres Herstellers/.test(on));
    check('and says tapping stays available', /antippen/.test(on));

    await page.getByText('Ich tippe die Antwort an', { exact: false }).first().click();
    await page.waitForTimeout(250);
    check('notice goes away again on switching back',
      !(await page.textContent('body')).includes('Hinweis zur Spracheingabe'));
    check('voice flow raises no page errors', errors.length === 0, errors[0] ?? '');
    await ctx.close();
  }

  // ------------------------------------------------ an intake, through to the end
  {
    const { ctx, page, errors } = await fresh();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const start = page.getByRole('button', { name: /Los geht|Starten|Beginnen|Weiter/i }).first();
    if (await start.count()) await start.click();
    await page.waitForTimeout(250);

    // Answer, rather than click Weiter past everything.
    //
    // The first version of this walk advanced through the whole intake without
    // touching an answer and still reached the report -- which is correct
    // behaviour, and made the PDF assertions below vacuous: the document said
    // "0 Fragen beantwortet" and had no answers section to check. The controls
    // are radio inputs inside labels, so that is what to drive.
    //
    // Yes to every gate, and otherwise the last option on the scale, which is
    // the most dependent one. That opens every module and produces a document
    // with something in it.
    let reached = false;
    let answered = 0;
    for (let i = 0; i < 120 && !reached; i++) {
      if ((await page.textContent('body')).includes('Beträge zuletzt geprüft')) {
        reached = true;
        break;
      }

      const screen = await page.textContent('body');
      // The limb question is § 15 Abs. 4: a yes settles the grade at 5 on the
      // spot and correctly ends the intake. Answering yes to everything was
      // therefore a five-question run, which is the engine working and a
      // useless walk. Say no to that one only.
      const isLimbGate = /beide Arme und beide Beine/.test(screen);

      const radios = page.locator('input[type=radio]');
      const n = await radios.count();
      if (n) {
        const labels = await radios.evaluateAll((els) =>
          els.map((el) => (el.closest('label')?.textContent ?? '').trim()),
        );
        const yes = labels.findIndex((l) => /^Ja\b/.test(l));
        const no = labels.findIndex((l) => /^Nein\b/.test(l));

        let choice;
        if (yes !== -1 || no !== -1) {
          // A gate: yes opens a module, except the one that ends the intake.
          choice = isLimbGate ? no : yes;
        } else {
          // A scale: the last option is the most dependent, which keeps every
          // module in play and gives the document something to say.
          choice = n - 1;
        }
        if (choice !== undefined && choice >= 0) {
          await radios.nth(choice).check({ force: true }).catch(() => {});
          answered += 1;
        }
      }

      const grade = page.locator('button[aria-pressed]');
      if (!n && (await grade.count())) await grade.first().click().catch(() => {});

      // Scoped to the nav strip on purpose. Matching /Ergebnis/ anywhere also
      // hits "Ergebnis jetzt schon anzeigen", the stop-early link, which ended
      // the walk after the five gating questions -- none of which belong to a
      // module, so the PDF had no headings to check and the assertion below
      // failed for the wrong reason entirely.
      const next = page.locator('nav').getByRole('button').last();
      if (await next.count()) await next.click().catch(() => {});
      await page.waitForTimeout(110);
    }
    check('the walk answered a real intake', answered > 12, `${answered} screens answered`);

    const report = await page.textContent('body');
    check('an intake reaches the report', reached);
    check('the report dates the figures', /Beträge zuletzt geprüft:\s*\p{L}+ \d{4}/u.test(report),
      (report.match(/Beträge zuletzt geprüft:\s*\p{L}+ \d{4}/u) ?? [''])[0]);
    check('the date is a month and a year, never a day',
      !/Beträge zuletzt geprüft:\s*\d/.test(report));
    check('no stale warning while the figures are fresh',
      !report.includes('länger nicht geprüft'));
    check('the intake raises no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

    // ---------------------------------------------------- the PDF, actually opened
    //
    // The document is the deliverable: it is what gets carried across a desk at
    // the Pflegekasse. Reaching the button proves nothing about what is in the
    // file, so this downloads it and reads the text out of it.
    if (reached) {
      const pdfButton = page.getByRole('button', { name: /PDF/i }).first();
      if (await pdfButton.count()) {
        const waitDownload = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
        await pdfButton.click();
        const download = await waitDownload;
        check('the PDF downloads', Boolean(download), download ? await download.suggestedFilename() : '');

        if (download) {
          const file = await download.path();
          const bytes = await readFile(file);
          check('it is a real PDF', bytes.subarray(0, 5).toString() === '%PDF-');
          check('it is not an empty shell', bytes.length > 4000, `${(bytes.length / 1024).toFixed(0)} kB`);

          const text = pdfText(bytes);
          check('it names the estimated Pflegegrad', /Pflegegrad/.test(text));
          check('it carries the date the figures were checked',
            /Betr.{0,3}ge zuletzt gepr.{0,3}ft/.test(text));
          check('it reproduces the answers that were given', /Ihre Antworten/.test(text));
          check('and did not record an empty intake',
            !/\b0 Fragen beantwortet/.test(text),
            (text.match(/\d+ Fragen beantwortet[^\n]{0,22}/) ?? [''])[0]);
          check('it puts the answers under module headings', /Modul\s*1/.test(text),
            (text.match(/Modul\s*\d[^\n]{0,24}/g) ?? []).slice(0, 3).join(' | '));
          check('module 5 is printed before module 6',
            text.indexOf('Modul 5') === -1 || text.indexOf('Modul 6') === -1 ||
            text.indexOf('Modul 5') < text.indexOf('Modul 6'));
          check('it says it is an estimate, not an assessment',
            /Einsch.{0,3}tzung/.test(text) && /§ 7a/.test(text));
        }
      } else {
        check('PDF button reachable', false, '(button not found)');
      }
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main();
