/**
 * The palette is an accessibility promise, so it is tested like one.
 *
 * These ratios are the reason the product is usable by the people it is for. A
 * later "let's soften that grey" is exactly the kind of change that looks
 * harmless in a pull request and quietly puts the muted text below the
 * threshold, so every pair that carries text is pinned here.
 *
 * Every pair is held to WCAG AAA (7:1) rather than AA (4.5:1). AA is the legal
 * floor; AAA is what an audience with age-related contrast loss actually needs,
 * and the palette was chosen to clear it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance, per the WCAG 2 definition. */
function luminance([r, g, b]: RGB): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const AAA = 7;

/** Every foreground/background pair the interface actually puts text on. */
const PAIRS: ReadonlyArray<{ theme: string; what: string; fg: string; bg: string }> = [
  // light
  { theme: 'light', what: 'body text on the page', fg: '#131b1e', bg: '#f4f7f7' },
  { theme: 'light', what: 'body text on a card', fg: '#131b1e', bg: '#ffffff' },
  { theme: 'light', what: 'muted text on a card', fg: '#425258', bg: '#ffffff' },
  { theme: 'light', what: 'muted text on a raised card', fg: '#425258', bg: '#eaf0f0' },
  { theme: 'light', what: 'accent text on a card', fg: '#085a52', bg: '#ffffff' },
  { theme: 'light', what: 'accent text on a raised card', fg: '#085a52', bg: '#eaf0f0' },
  { theme: 'light', what: 'body text on a raised card', fg: '#131b1e', bg: '#eaf0f0' },
  { theme: 'light', what: 'label on a selected option', fg: '#ffffff', bg: '#085a52' },
  { theme: 'light', what: 'warning text', fg: '#4a2f04', bg: '#fdf3e0' },

  // dark
  { theme: 'dark', what: 'body text on the page', fg: '#e6edee', bg: '#0e1417' },
  { theme: 'dark', what: 'body text on a card', fg: '#e6edee', bg: '#161f23' },
  { theme: 'dark', what: 'muted text on a card', fg: '#a5b6bb', bg: '#161f23' },
  { theme: 'dark', what: 'muted text on a raised card', fg: '#a5b6bb', bg: '#1e2a2f' },
  { theme: 'dark', what: 'accent text on a card', fg: '#4fd6c4', bg: '#161f23' },
  { theme: 'dark', what: 'accent text on a raised card', fg: '#4fd6c4', bg: '#1e2a2f' },
  { theme: 'dark', what: 'body text on a raised card', fg: '#e6edee', bg: '#1e2a2f' },
  { theme: 'dark', what: 'label on a selected option', fg: '#06231f', bg: '#4fd6c4' },
  { theme: 'dark', what: 'warning text', fg: '#f6e4bd', bg: '#2e2410' },

  // high contrast
  { theme: 'contrast-light', what: 'body text', fg: '#000000', bg: '#ffffff' },
  { theme: 'contrast-light', what: 'label on a selected option', fg: '#ffffff', bg: '#00407a' },
  { theme: 'contrast-light', what: 'accent text', fg: '#00407a', bg: '#ffffff' },
  { theme: 'contrast-dark', what: 'body text', fg: '#ffe700', bg: '#000000' },
  { theme: 'contrast-dark', what: 'label on a selected option', fg: '#000000', bg: '#ffe700' },
  { theme: 'contrast-dark', what: 'warning text', fg: '#ffffff', bg: '#000000' },
];

describe('every colour pair that carries text meets WCAG AAA', () => {
  it.each(PAIRS)('$theme: $what', ({ fg, bg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AAA);
  });

  it('holds the high-contrast schemes well clear of the threshold', () => {
    // These exist specifically for people the ordinary themes do not serve, so
    // scraping past 7:1 would defeat the point of offering them.
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(20);
    expect(contrastRatio('#ffe700', '#000000')).toBeGreaterThan(15);
  });
});

describe('the tested colours are the colours actually shipped', () => {
  // A palette test is worthless if the stylesheet has moved on without it.
  const css = readFileSync(join(__dirname, '..', '..', 'app', 'globals.css'), 'utf8');

  it.each([...new Set(PAIRS.flatMap((p) => [p.fg, p.bg]))])(
    '%s appears in globals.css',
    (colour) => {
      expect(css.toLowerCase()).toContain(colour.toLowerCase());
    },
  );

  it('gives the high-contrast themes thicker borders', () => {
    // Contrast alone does not separate a button from its background for someone
    // with low vision; the border weight is doing real work.
    const contrastBlocks = css.match(/\[data-theme="contrast-[^"]+"\]\s*\{[^}]+\}/g) ?? [];
    expect(contrastBlocks).toHaveLength(2);
    for (const block of contrastBlocks) {
      expect(block).toContain('--line-width: 3px');
    }
  });

  it('keeps a visible focus outline that cannot be overridden away', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toMatch(/outline:\s*3px solid var\(--focus\)/);
  });

  it('sets a tap target at least 44px at normal text size', () => {
    const target = css.match(/\.target\s*\{[^}]+\}/)?.[0] ?? '';
    const rem = Number(target.match(/min-height:\s*([\d.]+)rem/)?.[1]);
    expect(rem * 16).toBeGreaterThanOrEqual(44);
  });
});
