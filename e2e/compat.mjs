/**
 * The oldest browser this build still works on.
 *
 * It matters more here than on most projects. The people this exists for are
 * disproportionately on old phones: an iPhone 7 stops at iOS 15.8, and its
 * owner is exactly the person who needs the largest text setting. A page that
 * renders unstyled for them is not a degraded experience, it is no experience.
 *
 * Tailwind v4 sets the floor and says so plainly: it depends on `@property`
 * and `color-mix()` for core features and "will not work in older browsers" —
 * Safari 16.4, Chrome 111, Firefox 128.
 * https://tailwindcss.com/docs/compatibility
 *
 * This scans the built output for features that would raise that floor
 * further. It is not a polyfill check and it cannot prove the app works on an
 * old device — only a real device can. What it does is stop the floor moving
 * by accident, which is how a floor usually moves.
 *
 * Usage:  npm run build && npm run test:compat
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/** What the project has decided to require. Raising this is a product call. */
const FLOOR = { safari: 16.4, chrome: 111, firefox: 128 };

/**
 * `breaking: false` means the feature degrades on its own — the page still
 * works, it just looks slightly worse. Those never fail the check.
 */
const FEATURES = [
  // --- JavaScript
  { kind: 'js', label: '??=', re: /\?\?=/, safari: 14, chrome: 85, firefox: 79, breaking: true },
  { kind: 'js', label: '||= / &&=', re: /\|\|=|&&=/, safari: 14, chrome: 85, firefox: 79, breaking: true },
  { kind: 'js', label: 'private class fields', re: /[^\w]#[a-zA-Z_]\w*\s*[=(;]/, safari: 14.1, chrome: 74, firefox: 90, breaking: true },
  { kind: 'js', label: 'Array.prototype.at', re: /\.at\(/, safari: 15.4, chrome: 92, firefox: 90, breaking: true },
  { kind: 'js', label: 'Object.hasOwn', re: /Object\.hasOwn\(/, safari: 15.4, chrome: 93, firefox: 92, breaking: true },
  { kind: 'js', label: 'findLast', re: /\.findLast\(/, safari: 15.4, chrome: 97, firefox: 104, breaking: true },
  { kind: 'js', label: 'structuredClone', re: /structuredClone\(/, safari: 15.4, chrome: 98, firefox: 94, breaking: true },
  { kind: 'js', label: 'class static blocks', re: /static\s*\{/, safari: 16.4, chrome: 94, firefox: 93, breaking: true },
  { kind: 'js', label: 'RegExp v flag', re: /\/[gimsuy]*v[gimsuy]*[;,)\]]/, safari: 17, chrome: 112, firefox: 116, breaking: true },
  // --- CSS
  { kind: 'css', label: '@property', re: /@property/, safari: 16.4, chrome: 85, firefox: 128, breaking: true },
  { kind: 'css', label: 'color-mix()', re: /color-mix\(/, safari: 16.2, chrome: 111, firefox: 113, breaking: true },
  { kind: 'css', label: 'oklch()', re: /oklch\(/, safari: 15.4, chrome: 111, firefox: 113, breaking: true },
  { kind: 'css', label: ':has()', re: /:has\(/, safari: 15.4, chrome: 105, firefox: 121, breaking: true },
  { kind: 'css', label: '@container', re: /@container/, safari: 16, chrome: 105, firefox: 110, breaking: true },
  { kind: 'css', label: 'native nesting', re: /&\s*[.:#[]/, safari: 16.5, chrome: 112, firefox: 117, breaking: true },
  // Progressive enhancement: unsupported simply means ordinary wrapping.
  { kind: 'css', label: 'text-wrap', re: /text-wrap\s*:/, safari: 17.5, chrome: 114, firefox: 121, breaking: false },
];

const DIRS = ['.next/static/chunks', '.next/static/css'];

async function main() {
  const hits = [];
  let scanned = 0;

  for (const dir of DIRS) {
    let names = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const n of names) {
      const kind = n.endsWith('.css') ? 'css' : n.endsWith('.js') ? 'js' : null;
      if (!kind) continue;
      scanned += 1;
      const body = await readFile(path.join(dir, n), 'utf8');
      for (const f of FEATURES) {
        if (f.kind === kind && f.re.test(body) && !hits.includes(f)) hits.push(f);
      }
    }
  }

  if (scanned === 0) {
    console.error('\n  No build output found. Run: npm run build\n');
    process.exit(2);
  }

  const breaking = hits.filter((f) => f.breaking);
  const required = {
    safari: Math.max(0, ...breaking.map((f) => f.safari)),
    chrome: Math.max(0, ...breaking.map((f) => f.chrome)),
    firefox: Math.max(0, ...breaking.map((f) => f.firefox)),
  };

  console.log(`\n  Scanned ${scanned} built files.\n`);
  for (const f of hits) {
    const mark = f.breaking ? ' ' : '~';
    console.log(
      `  ${mark} ${f.label.padEnd(22)} Safari ${String(f.safari).padEnd(6)} Chrome ${String(f.chrome).padEnd(5)} Firefox ${f.firefox}`,
    );
  }
  console.log(`\n  (~ degrades on its own and does not set the floor)\n`);
  console.log(`  Required:  Safari ${required.safari}, Chrome ${required.chrome}, Firefox ${required.firefox}`);
  console.log(`  Declared:  Safari ${FLOOR.safari}, Chrome ${FLOOR.chrome}, Firefox ${FLOOR.firefox}\n`);

  let failed = false;
  for (const engine of ['safari', 'chrome', 'firefox']) {
    if (required[engine] > FLOOR[engine]) {
      console.error(
        `  [FAIL] ${engine} floor has risen to ${required[engine]}, above the declared ${FLOOR[engine]}.\n` +
          `         Something added a feature older devices do not have. Either drop it,\n` +
          `         or raise FLOOR here and say so in README.md — deliberately, not by accident.`,
      );
      failed = true;
    }
  }
  if (!failed) console.log('  [PASS] the floor has not moved.\n');
  process.exit(failed ? 1 : 0);
}

main();
