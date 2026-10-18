/**
 * The assumption the short intake rests on, tested rather than asserted.
 *
 * `adaptive.ts` stops asking as soon as the best and worst cases for the
 * unasked questions agree on a grade, and justifies that with one sentence:
 * the assessment is monotonic in every module, so the two bounds bracket every
 * way the intake could have ended. That sentence carries the whole "twelve
 * questions instead of sixty-four" claim. Until this file, it was prose.
 *
 * The existing suite checks the model against itself — the same `criteria.ts`
 * feeds both paths, so a misreading of the instrument passes twice. These
 * tests are different in kind: they generate households at random and assert
 * structural properties that must hold for the early stop to be safe at all.
 *
 * Randomised, but not flaky: the generator is seeded, so a failure reproduces
 * exactly and the seed is printed with it.
 */

import { describe, it, expect } from 'vitest';
import { CRITERIA, type ConditionId, type Criterion } from './criteria';
import {
  assessIntake,
  emptyIntake,
  isApplicable,
  type IntakeAnswers,
} from './score';
import { gradeBounds } from './adaptive';
import { M5_INTENSIVE_BANDS } from './score';

const CONDITION_IDS: ConditionId[] = [
  'hasCognitiveIssues',
  'hasBehaviourIssues',
  'hasIncontinence',
  'hasStomaOrCatheter',
  'hasTubeFeeding',
  'hasMedicalMeasures',
  'hasLimbUnusability',
];

/** mulberry32: small, seeded, and good enough to shake out structure. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const grade = (a: IntakeAnswers) => assessIntake(a).assessment.grade;

/** A household with every gate decided and some, but not all, answers given. */
function randomPartial(r: () => number): IntakeAnswers {
  const a = emptyIntake();
  for (const id of CONDITION_IDS) a.conditions[id] = r() < 0.5;

  for (const c of CRITERIA) {
    if (!isApplicable(c, a.conditions)) continue;
    if (r() < 0.45) continue; // left unanswered on purpose
    a.levels[c.id] = Math.floor(r() * c.points.length);
  }

  if (a.conditions.hasMedicalMeasures) {
    if (r() < 0.6) a.m5 = {};
    if (a.m5 && r() < 0.7) a.m5.daily = Math.floor(r() * 4);
    if (a.m5 && r() < 0.7) a.m5.weekly = Math.floor(r() * 4);
    if (a.m5 && r() < 0.7) a.m5.intensive = pick(r, M5_INTENSIVE_BANDS);
    if (r() < 0.7) a.dietLevel = Math.floor(r() * 4);
  }
  return a;
}

/** Fill in everything still open, one arbitrary way out of the many possible. */
function completeRandomly(base: IntakeAnswers, r: () => number): IntakeAnswers {
  const a: IntakeAnswers = {
    conditions: { ...base.conditions },
    levels: { ...base.levels },
    frequencies: { ...base.frequencies },
    m5: base.m5 ? { ...base.m5 } : undefined,
    dietLevel: base.dietLevel,
  };

  for (const c of CRITERIA) {
    if (!isApplicable(c, a.conditions)) continue;
    if (a.levels[c.id] === undefined) a.levels[c.id] = Math.floor(r() * c.points.length);
  }

  if (a.conditions.hasMedicalMeasures) {
    a.m5 = a.m5 ?? {};
    if (a.m5.daily === undefined) a.m5.daily = Math.floor(r() * 4);
    if (a.m5.weekly === undefined) a.m5.weekly = Math.floor(r() * 4);
    if (a.m5.intensive === undefined) a.m5.intensive = pick(r, M5_INTENSIVE_BANDS);
    if (a.dietLevel === undefined) a.dietLevel = Math.floor(r() * 4);
  }
  return a;
}

/** A level scoring strictly more than the one given, if the scale offers one. */
function harsherLevel(c: Criterion, level: number, r: () => number): number | null {
  const current = c.points[level];
  const worse = c.points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p > current)
    .map(({ i }) => i);
  return worse.length === 0 ? null : pick(r, worse);
}

describe('the bounds bracket every way the intake could finish', () => {
  it('never lets a completed intake land outside its own bounds', () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const r = rng(seed);
      const partial = randomPartial(r);
      const b = gradeBounds(partial);

      for (let k = 0; k < 4; k++) {
        const done = completeRandomly(partial, r);
        const g = grade(done);
        expect(g, `seed ${seed}, completion ${k}: ${g} outside [${b.low}, ${b.high}]`).toBeGreaterThanOrEqual(b.low);
        expect(g, `seed ${seed}, completion ${k}: ${g} outside [${b.low}, ${b.high}]`).toBeLessThanOrEqual(b.high);
      }
    }
  });

  /**
   * The early stop, stated as the thing it actually promises.
   *
   * Where the bounds agree, `adaptive.ts` ends the intake and reports that
   * grade. That is only honest if every remaining answer, whatever it turns
   * out to be, leads to the same grade. This asserts exactly that.
   */
  it('gives one grade for every completion once the bounds have agreed', () => {
    let resolvedCases = 0;

    for (let seed = 1; seed <= 1500; seed++) {
      const r = rng(seed + 10_000);
      const partial = randomPartial(r);
      const b = gradeBounds(partial);
      if (!b.resolved) continue;
      resolvedCases++;

      for (let k = 0; k < 6; k++) {
        const g = grade(completeRandomly(partial, r));
        expect(
          g,
          `seed ${seed}: bounds said ${b.low} was settled, completion ${k} gave ${g}`,
        ).toBe(b.low);
      }
    }

    // A guard on the guard: a generator that never produces a settled intake
    // would make the assertion above vacuous and the suite quietly useless.
    expect(resolvedCases, 'no settled intakes generated; this test proved nothing').toBeGreaterThan(50);
  });

  it('never reports a low bound above its high bound', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const b = gradeBounds(randomPartial(rng(seed + 20_000)));
      expect(b.low, `seed ${seed}`).toBeLessThanOrEqual(b.high);
      expect(b.resolved).toBe(b.low === b.high);
    }
  });
});

describe('the assessment is monotonic, which is why the bounds work', () => {
  it('never lowers the grade when one criterion moves to a harsher level', () => {
    let moves = 0;

    for (let seed = 1; seed <= 2000; seed++) {
      const r = rng(seed + 30_000);
      const before = completeRandomly(randomPartial(r), r);

      const answered = CRITERIA.filter(
        (c) => isApplicable(c, before.conditions) && before.levels[c.id] !== undefined,
      );
      if (answered.length === 0) continue;

      const c = pick(r, answered);
      const worse = harsherLevel(c, before.levels[c.id], r);
      if (worse === null) continue;
      moves++;

      const after: IntakeAnswers = { ...before, levels: { ...before.levels, [c.id]: worse } };
      expect(
        grade(after),
        `seed ${seed}: raising ${c.id} from level ${before.levels[c.id]} to ${worse} lowered the grade`,
      ).toBeGreaterThanOrEqual(grade(before));
    }

    expect(moves, 'no criterion was ever made harsher; test is vacuous').toBeGreaterThan(500);
  });

  it('never lowers the grade when a module 5 band rises', () => {
    for (let seed = 1; seed <= 1200; seed++) {
      const r = rng(seed + 40_000);
      const before = completeRandomly(randomPartial(r), r);
      if (!before.conditions.hasMedicalMeasures || !before.m5) continue;

      for (const key of ['daily', 'weekly'] as const) {
        const v = before.m5[key];
        if (v === undefined || v >= 3) continue;
        const after: IntakeAnswers = { ...before, m5: { ...before.m5, [key]: v + 1 } };
        expect(grade(after), `seed ${seed}: raising m5.${key} lowered the grade`).toBeGreaterThanOrEqual(
          grade(before),
        );
      }
    }
  });

  /**
   * The discontinuity, checked on purpose.
   *
   * § 15 Abs. 4 jumps straight to Pflegegrad 5 without reference to the point
   * total. A rule that ignores the score is exactly where a monotonicity
   * assumption would fail quietly if it were going to fail anywhere.
   */
  it('never lowers the grade when the Bedarfskonstellation gate turns on', () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const r = rng(seed + 50_000);
      const off = completeRandomly(randomPartial(r), r);
      off.conditions.hasLimbUnusability = false;

      const on: IntakeAnswers = {
        ...off,
        conditions: { ...off.conditions, hasLimbUnusability: true },
      };
      expect(grade(on), `seed ${seed}: the § 15 Abs. 4 gate lowered the grade`).toBeGreaterThanOrEqual(
        grade(off),
      );
    }
  });
});
