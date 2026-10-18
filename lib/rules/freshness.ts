/**
 * How old the statutory figures are, and what to do about it.
 *
 * `sources.ts` records a `checkedOn` date against every figure. Until this
 * file existed, nothing read those dates: they were a promise in a comment,
 * and the promise was the only thing standing between a family and a
 * confidently-stated euro amount that stopped being true in January.
 *
 * That is the failure mode this product cannot survive. A wrong number here
 * does not look wrong — it arrives with a paragraph reference beside it, which
 * makes it *more* believable, not less. And it fails silently: there is no
 * server to alert, no error to log, and nobody finds out until a family is
 * told otherwise at the counter.
 *
 * So the dates are now load-bearing in three places:
 *
 *   1. `freshness.test.ts` fails the build once the oldest figure passes
 *      `FAIL_AFTER_DAYS`. This is deliberate, and it is a deadman's switch
 *      rather than a lint rule: it goes off whether or not anyone is paying
 *      attention, which is exactly when it is needed. Clearing it means
 *      re-reading the sources and updating `checkedOn` — there is no way to
 *      silence it that does not involve doing the work.
 *   2. The report shows the date, so an adviser can judge for themselves.
 *   3. Past `WARN_AFTER_DAYS` the report says so in words, because by then the
 *      reader deserves to be told rather than left to check a footer.
 *
 * The thresholds are set against a known cliff: `sources.ts` records that
 * Pflegegeld has no increase scheduled before 1 January 2028. Failing at 180
 * days guarantees at least two forced re-checks before that date arrives.
 */

import { SOURCES } from './sources';

/** Past this, the report tells the reader the figures are ageing. */
export const WARN_AFTER_DAYS = 120;

/** Past this, the build fails. See the note above: this is on purpose. */
export const FAIL_AFTER_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every `checkedOn` in the registry, oldest first. */
export function checkDates(): string[] {
  return Object.values(SOURCES)
    .map((s) => s.checkedOn)
    .sort();
}

/**
 * The oldest `checkedOn` in the registry.
 *
 * The oldest rather than the newest, because the report presents the figures
 * as one body of information. Touching one source does not refresh the others,
 * and a headline dated by the most recently edited entry would overstate how
 * current the rest of it is.
 */
export function oldestCheckedOn(): string {
  const dates = checkDates();
  if (dates.length === 0) throw new Error('SOURCES is empty: nothing to date.');
  return dates[0];
}

export function daysSince(iso: string, now: Date = new Date()): number {
  const then = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(then)) throw new Error(`Not an ISO date: ${iso}`);
  return Math.floor((now.getTime() - then) / DAY_MS);
}

export type FreshnessLevel = 'fresh' | 'ageing' | 'stale';

export interface Freshness {
  /** Oldest `checkedOn` across the registry, ISO. */
  checkedOn: string;
  /** Whole days since that date. Negative would mean a date in the future. */
  days: number;
  level: FreshnessLevel;
}

export function freshness(now: Date = new Date()): Freshness {
  const checkedOn = oldestCheckedOn();
  const days = daysSince(checkedOn, now);
  const level: FreshnessLevel =
    days >= FAIL_AFTER_DAYS ? 'stale' : days >= WARN_AFTER_DAYS ? 'ageing' : 'fresh';
  return { checkedOn, days, level };
}

/**
 * The date to print, as a month and year.
 *
 * A day-level date invites a precision the figures do not have: what is being
 * claimed is "these were checked against the statute around then", not that
 * anything happened on a particular Tuesday.
 */
export function asOfMonth(lang: 'de' | 'en', now: Date = new Date()): string {
  const { checkedOn } = freshness(now);
  const d = new Date(`${checkedOn}T00:00:00Z`);
  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
