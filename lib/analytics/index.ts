/**
 * Counting usage, without touching answers.
 *
 * Off unless the build sets `NEXT_PUBLIC_ANALYTICS_PROVIDER`. `NEXT_PUBLIC_`
 * values are inlined by `next build`, so a default build carries no provider
 * script and `track()` returns before doing anything at all: no network, no
 * script, no storage.
 *
 * When on, five events are counted, each with a fixed and small set of coarse
 * properties. The allow-list below is enforced at runtime as well as by the
 * types, so a careless call site cannot widen what leaves the device. Never
 * add the grade, the points, an answer, a date or anything typed by a person.
 *
 * This module is provider-agnostic. The one file that knows the vendor is
 * `./plausible.ts`; swapping vendors means replacing that file and the
 * `provider()` switch here, and nothing else in the app.
 */

import type { ContentLang, Lang } from '../i18n';
import type { Pace } from '../a11y/settings';
import * as plausible from './plausible';

// ------------------------------------------------------------------ partners

/**
 * A partner organisation's short name, as it appears in `?via=<slug>`.
 *
 * Lower-case letters, digits and hyphens, one to forty characters. Anything
 * else is dropped rather than repaired: a slug that has to be guessed at is a
 * slug that ends up attributed to the wrong organisation.
 */
export type PartnerSlug = string & { readonly __brand: 'PartnerSlug' };

/** Kept identical to the copy in the early script in `app/layout.tsx`. */
export const PARTNER_SLUG_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Validate an unknown value into a slug, or null. Lower-cases first. */
export function parsePartnerSlug(v: unknown): PartnerSlug | null {
  if (typeof v !== 'string') return null;
  const lower = v.toLowerCase();
  return PARTNER_SLUG_PATTERN.test(lower) ? (lower as PartnerSlug) : null;
}

/**
 * The partner of this page visit, or null.
 *
 * Set by the early script in `app/layout.tsx` from `?via=` and held in memory
 * only, never in any storage: a reload or a new tab starts without it. That
 * is intended. Re-validated here, because anything on `window` can be written
 * by anything else in the page.
 */
export function currentPartner(): PartnerSlug | null {
  if (typeof window === 'undefined') return null;
  return parsePartnerSlug(window.__anspruchPartner);
}

/** Read `via` from a query string such as `location.search`. */
export function readPartnerFromUrl(search: string): PartnerSlug | null {
  let via: string | null;
  try {
    via = new URLSearchParams(search).get('via');
  } catch {
    return null;
  }
  return parsePartnerSlug(via);
}

// ------------------------------------------------------------------- buckets

export type QuestionsBucket = 'lte10' | 'lte20' | 'lte40' | 'gt40';
export type GapBucket = '0' | 'lt100' | 'lt300' | 'lt600' | 'gte600';
/** Whether a result was reached, never which one. */
export type ResultKind = 'none' | 'range' | 'grade';

/** How many questions were answered, as a band. */
export function bucketQuestions(n: number): QuestionsBucket {
  if (n <= 10) return 'lte10';
  if (n <= 20) return 'lte20';
  if (n <= 40) return 'lte40';
  return 'gt40';
}

/**
 * The monthly unclaimed amount, as a band in euros.
 *
 * The only value derived from the result that is ever sent, and only as one of
 * five bands, so it cannot be worked back into a grade.
 */
export function bucketMonthlyGap(cents: number): GapBucket {
  const euros = cents / 100;
  if (!(euros > 0)) return '0';
  if (euros < 100) return 'lt100';
  if (euros < 300) return 'lt300';
  if (euros < 600) return 'lt600';
  return 'gte600';
}

// -------------------------------------------------------------------- events

/**
 * What the call site supplies for every event. `partner` is added by `track`
 * itself from `currentPartner()`, as the slug or `"none"`.
 */
export interface CommonProps {
  lang: Lang;
  pace: Pace;
}

export interface EventProps {
  intake_started: CommonProps;
  result_shown: CommonProps & { questions: QuestionsBucket; result: ResultKind; gap: GapBucket };
  questions_refined: CommonProps;
  pdf_downloaded: CommonProps & { doc_lang: ContentLang };
  intake_erased: CommonProps;
}

export type AnalyticsEvent = keyof EventProps;

const COMMON_KEYS = ['lang', 'pace', 'partner'] as const;

/** Exactly the properties each event may carry. Nothing else is ever sent. */
export const ALLOWED_PROPS: Record<AnalyticsEvent, readonly string[]> = {
  intake_started: COMMON_KEYS,
  result_shown: [...COMMON_KEYS, 'questions', 'result', 'gap'],
  questions_refined: COMMON_KEYS,
  pdf_downloaded: [...COMMON_KEYS, 'doc_lang'],
  intake_erased: COMMON_KEYS,
};

type Provider = 'plausible' | null;

/**
 * Which provider this build was made with.
 *
 * `process.env.NEXT_PUBLIC_*` is written out in full so that `next build` can
 * inline it; a dynamic lookup would not be replaced. Read on every call rather
 * than once at import, so tests can switch it.
 */
function provider(): Provider {
  const name = (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? '').trim().toLowerCase();
  if (name === 'plausible' && plausible.configured()) return 'plausible';
  return null;
}

/** True only when the build set a provider and everything it needs. */
export function isEnabled(): boolean {
  return provider() !== null;
}

/** Keep only the allowed keys, and only short plain strings. */
export function sanitise(
  event: AnalyticsEvent,
  props: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ALLOWED_PROPS[event]) {
    const v = props[key];
    if (key === 'partner') {
      out.partner = parsePartnerSlug(v) ?? 'none';
    } else if (typeof v === 'string' && v.length > 0 && v.length <= 12) {
      out[key] = v;
    }
  }
  return out;
}

/** Count one event. A no-op, with no side effects at all, when disabled. */
export function track<E extends AnalyticsEvent>(event: E, props: EventProps[E]): void {
  const p = provider();
  if (p === null) return;
  if (typeof window === 'undefined') return;
  const clean = sanitise(event, {
    ...(props as unknown as Record<string, unknown>),
    partner: currentPartner(),
  });
  if (p === 'plausible') plausible.send(event, clean);
}

/**
 * The provider script's attributes (`src` and data attributes), or null when
 * off. Kept here so the layout and the script component stay vendor-neutral.
 */
export function providerScript(): Record<string, string> | null {
  if (provider() === 'plausible') return plausible.scriptAttributes();
  return null;
}

/** Called once the provider's script has loaded. */
export function providerReady(): void {
  if (provider() === 'plausible') plausible.ready();
}
