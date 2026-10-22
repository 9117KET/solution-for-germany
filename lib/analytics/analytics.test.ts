import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLOWED_PROPS,
  PARTNER_SLUG_PATTERN,
  currentPartner,
  bucketMonthlyGap,
  bucketQuestions,
  isEnabled,
  parsePartnerSlug,
  providerReady,
  providerScript,
  readPartnerFromUrl,
  sanitise,
  track,
} from './index';
import { resetForTests, withoutQuery } from './plausible';
import { DEFAULTS, parseSettings } from '../a11y/settings';

const common = { lang: 'de', pace: 'one' } as const;

describe('partner slug from the URL', () => {
  it('accepts a plain slug', () => {
    expect(readPartnerFromUrl('?via=caritas-berlin')).toBe('caritas-berlin');
    expect(readPartnerFromUrl('?x=1&via=vdk-42')).toBe('vdk-42');
  });

  it('lower-cases before validating', () => {
    expect(readPartnerFromUrl('?via=Caritas-Berlin')).toBe('caritas-berlin');
  });

  it('accepts 40 characters and rejects 41', () => {
    expect(readPartnerFromUrl(`?via=${'a'.repeat(40)}`)).toBe('a'.repeat(40));
    expect(readPartnerFromUrl(`?via=${'a'.repeat(41)}`)).toBeNull();
  });

  it('rejects anything that is not letters, digits and hyphens', () => {
    for (const bad of [
      '../x',
      '%2E%2E%2Fx',
      '<script>alert(1)</script>',
      'a b',
      'a_b',
      'caritas.berlin',
      'ünïcode',
      '"onload="x',
    ]) {
      expect(readPartnerFromUrl(`?via=${bad}`), bad).toBeNull();
    }
  });

  it('returns null when there is nothing to read', () => {
    expect(readPartnerFromUrl('')).toBeNull();
    expect(readPartnerFromUrl('?via=')).toBeNull();
    expect(readPartnerFromUrl('?other=1')).toBeNull();
    expect(parsePartnerSlug(42)).toBeNull();
    expect(parsePartnerSlug(null)).toBeNull();
  });

  it('uses the same pattern as the early script in the layout', () => {
    const layout = readFileSync(join(__dirname, '..', '..', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain(`/${PARTNER_SLUG_PATTERN.source}/.test(via)`);
    expect(layout).toContain("u.searchParams.delete('via')");
    expect(layout).toContain('history.replaceState');
  });
});

describe('partner of this page visit, in memory only', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a valid slug set by the early script', () => {
    vi.stubGlobal('window', { __anspruchPartner: 'caritas-berlin' });
    expect(currentPartner()).toBe('caritas-berlin');
  });

  it('re-validates whatever is on window', () => {
    for (const bad of ['../x', 'a'.repeat(41), 7, { a: 1 }, '']) {
      vi.stubGlobal('window', { __anspruchPartner: bad });
      expect(currentPartner(), String(bad)).toBeNull();
    }
  });

  it('is null on the server and when nothing was set', () => {
    expect(currentPartner()).toBeNull();
    vi.stubGlobal('window', {});
    expect(currentPartner()).toBeNull();
  });

  it('is never written to or read from any storage', () => {
    const dir = __dirname;
    for (const file of ['index.ts', 'plausible.ts', 'script.tsx']) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src, file).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    }
    const layout = readFileSync(join(dir, '..', '..', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain('window.__anspruchPartner = via');
    expect(layout).not.toMatch(/partner[^\n]*(localStorage|sessionStorage)/i);
    expect(layout).not.toMatch(/(localStorage|sessionStorage)\.setItem/);
  });

  it('is not a display setting', () => {
    expect('partner' in DEFAULTS).toBe(false);
    expect('partner' in parseSettings({ partner: 'caritas-berlin' })).toBe(false);
  });
});

describe('buckets', () => {
  it('bands questions at their boundaries', () => {
    expect(bucketQuestions(0)).toBe('lte10');
    expect(bucketQuestions(10)).toBe('lte10');
    expect(bucketQuestions(11)).toBe('lte20');
    expect(bucketQuestions(20)).toBe('lte20');
    expect(bucketQuestions(21)).toBe('lte40');
    expect(bucketQuestions(40)).toBe('lte40');
    expect(bucketQuestions(41)).toBe('gt40');
  });

  it('bands the monthly gap in euros at their boundaries', () => {
    expect(bucketMonthlyGap(0)).toBe('0');
    expect(bucketMonthlyGap(-500)).toBe('0');
    expect(bucketMonthlyGap(1)).toBe('lt100');
    expect(bucketMonthlyGap(9_999)).toBe('lt100');
    expect(bucketMonthlyGap(10_000)).toBe('lt300');
    expect(bucketMonthlyGap(29_999)).toBe('lt300');
    expect(bucketMonthlyGap(30_000)).toBe('lt600');
    expect(bucketMonthlyGap(59_999)).toBe('lt600');
    expect(bucketMonthlyGap(60_000)).toBe('gte600');
  });
});

describe('what an event may carry', () => {
  it('lists exactly the agreed properties', () => {
    expect(ALLOWED_PROPS).toEqual({
      intake_started: ['lang', 'pace', 'partner'],
      result_shown: ['lang', 'pace', 'partner', 'questions', 'result', 'gap'],
      questions_refined: ['lang', 'pace', 'partner'],
      pdf_downloaded: ['lang', 'pace', 'partner', 'doc_lang'],
      intake_erased: ['lang', 'pace', 'partner'],
    });
  });

  it('drops anything not on the list, and sends a missing partner as "none"', () => {
    const out = sanitise('result_shown', {
      ...common,
      questions: 'lte20',
      result: 'grade',
      gap: 'lt300',
      grade: 3,
      points: 47.5,
      bescheidDate: '2026-01-01',
    });
    expect(out).toEqual({
      lang: 'de',
      pace: 'one',
      partner: 'none',
      questions: 'lte20',
      result: 'grade',
      gap: 'lt300',
    });
  });

  it('never lets an invalid partner value through', () => {
    expect(sanitise('intake_started', { ...common, partner: '../x' }).partner).toBe('none');
  });
});

describe('the strip of the query string', () => {
  it('removes query and hash', () => {
    expect(withoutQuery('https://x.test/a?via=b#c')).toBe('https://x.test/a');
    expect(withoutQuery('https://x.test/')).toBe('https://x.test/');
  });
});

describe('when analytics are off', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', '');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_SRC', 'https://plausible.io/js/script.tagged-events.js');
    resetForTests();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('is off for unset, empty, none, and unknown providers', () => {
    for (const v of ['', 'none', 'NONE', 'umami']) {
      vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', v);
      expect(isEnabled(), v).toBe(false);
      expect(providerScript(), v).toBeNull();
    }
  });

  it('is off when the provider is set but no script URL is', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', 'plausible');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_SRC', '');
    expect(isEnabled()).toBe(false);
  });

  it('track does nothing: no fetch, no vendor call, no window access', () => {
    const fetchSpy = vi.fn();
    const plausible = vi.fn();
    const windowGets = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal(
      'window',
      new Proxy(
        { plausible },
        {
          get(target, key) {
            windowGets(key);
            return (target as Record<PropertyKey, unknown>)[key];
          },
        },
      ),
    );

    track('intake_started', common);
    track('pdf_downloaded', { ...common, doc_lang: 'de' });
    providerReady();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(plausible).not.toHaveBeenCalled();
    expect(windowGets).not.toHaveBeenCalled();
  });
});

describe('when analytics are on', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', 'plausible');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_SRC', 'https://plausible.io/js/script.tagged-events.js');
    vi.stubEnv('NEXT_PUBLIC_PLAUSIBLE_DOMAIN', 'example.test');
    resetForTests();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('renders the script with the domain', () => {
    expect(isEnabled()).toBe(true);
    expect(providerScript()).toEqual({
      src: 'https://plausible.io/js/script.tagged-events.js',
      'data-domain': 'example.test',
    });
  });

  it('queues events until the script is ready, then sends only allowed props', () => {
    const plausible = vi.fn();
    const win: Record<string, unknown> = { plausible, __anspruchPartner: 'caritas-berlin' };
    vi.stubGlobal('window', win);

    track('intake_started', common);
    expect(plausible).not.toHaveBeenCalled();

    providerReady();
    expect(plausible).toHaveBeenCalledWith('intake_started', {
      props: { lang: 'de', pace: 'one', partner: 'caritas-berlin' },
    });

    // Extra keys from a careless call site are dropped, not sent.
    track('result_shown', {
      ...common,
      questions: 'lte20',
      result: 'range',
      gap: 'lt100',
      ...({ grade: 3 } as object),
    });
    expect(plausible).toHaveBeenLastCalledWith('result_shown', {
      props: {
        lang: 'de',
        pace: 'one',
        partner: 'caritas-berlin',
        questions: 'lte20',
        result: 'range',
        gap: 'lt100',
      },
    });

    delete win.__anspruchPartner;
    track('questions_refined', common);
    expect(plausible).toHaveBeenLastCalledWith('questions_refined', {
      props: { lang: 'de', pace: 'one', partner: 'none' },
    });
  });

  it('starts the newer script with automatic link, download and form tracking off', () => {
    const init = vi.fn();
    const plausible = Object.assign(vi.fn(), { init });
    vi.stubGlobal('window', { plausible });

    providerReady();
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0][0];
    expect(options).toMatchObject({
      outboundLinks: false,
      fileDownloads: false,
      formSubmissions: false,
    });
    expect(options.transformRequest({ u: 'https://x.test/?via=a', n: 'pageview' })).toEqual({
      u: 'https://x.test/',
      n: 'pageview',
    });
  });
});
