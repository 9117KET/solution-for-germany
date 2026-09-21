import { describe, it, expect } from 'vitest';
import { SOURCES } from './sources';
import {
  FAIL_AFTER_DAYS,
  WARN_AFTER_DAYS,
  asOfMonth,
  checkDates,
  daysSince,
  freshness,
  oldestCheckedOn,
} from './freshness';

describe('every figure carries a usable check date', () => {
  it('dates every source in ISO form', () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(s.checkedOn, `${id} has no checkedOn`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.checkedOn)), `${id}: ${s.checkedOn}`).toBe(false);
    }
  });

  it('never dates a check in the future', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(s.checkedOn.localeCompare(today), `${id} is dated ahead of today`).toBeLessThanOrEqual(
        0,
      );
    }
  });

  it('gives every source a statutory basis and a URL to check it against', () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(s.law, `${id} has no law`).toBeTruthy();
      expect(s.url, `${id} has no url`).toMatch(/^https:\/\//);
      expect(s.covers, `${id} does not say what it covers`).toBeTruthy();
    }
  });
});

/**
 * The deadman's switch.
 *
 * This test is designed to fail with the passage of time and nothing else. If
 * it is red, no code is broken: the figures are simply older than this product
 * is willing to state them without a human having looked again.
 *
 * Clearing it: open `lib/rules/sources.ts`, follow each `url`, confirm the
 * amount and the threshold still read the same, and set `checkedOn` to today.
 * `MAINTENANCE.md` walks through it. Raising the threshold instead is not a
 * fix — it moves the date at which a family is told the wrong number.
 */
describe('the figures have been checked recently enough to state', () => {
  it('has a human-verified date within the failure window', () => {
    const f = freshness();
    expect(
      f.days,
      `\n\n  The statutory figures were last checked on ${f.checkedOn}, ` +
        `${f.days} days ago.\n` +
        `  The limit is ${FAIL_AFTER_DAYS} days.\n\n` +
        `  Nothing is broken. The figures need re-verifying against their sources\n` +
        `  before this can be shown to anyone. See MAINTENANCE.md.\n`,
    ).toBeLessThan(FAIL_AFTER_DAYS);
  });
});

describe('freshness reporting', () => {
  it('dates the set by its oldest member, not its newest', () => {
    const dates = checkDates();
    expect(oldestCheckedOn()).toBe(dates[0]);
    expect(dates[dates.length - 1] >= dates[0]).toBe(true);
  });

  it('counts whole days', () => {
    expect(daysSince('2026-01-01', new Date('2026-01-01T12:00:00Z'))).toBe(0);
    expect(daysSince('2026-01-01', new Date('2026-01-02T00:00:00Z'))).toBe(1);
  });

  it('escalates fresh → ageing → stale at the thresholds', () => {
    const on = oldestCheckedOn();
    const at = (days: number) =>
      freshness(new Date(Date.parse(`${on}T00:00:00Z`) + days * 86_400_000)).level;

    expect(at(0)).toBe('fresh');
    expect(at(WARN_AFTER_DAYS - 1)).toBe('fresh');
    expect(at(WARN_AFTER_DAYS)).toBe('ageing');
    expect(at(FAIL_AFTER_DAYS - 1)).toBe('ageing');
    expect(at(FAIL_AFTER_DAYS)).toBe('stale');
  });

  it('prints a month and a year, never a day', () => {
    const de = asOfMonth('de');
    const en = asOfMonth('en');
    expect(de).toMatch(/^\p{L}+ \d{4}$/u);
    expect(en).toMatch(/^\p{L}+ \d{4}$/u);
    expect(de).not.toMatch(/\d{1,2}\./);
  });
});
