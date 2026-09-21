import { describe, it, expect } from 'vitest';
import { CRITERIA, criteriaFor, type ConditionId } from './criteria';
import {
  assessIntake,
  scoreIntake,
  scoreModule5,
  scoreM5Daily,
  scoreM5Weekly,
  scoreM5Intensive,
  emptyIntake,
  isApplicable,
  isM5Applicable,
  remainingCriteria,
  M5_CRITERIA,
  type IntakeAnswers,
} from './score';
import { MODULES, assess, type ModuleId } from '../rules/nba';
import { answerLines } from './summary';

const allConditions: Record<ConditionId, boolean> = {
  // Modules 2 and 3 are gated behind one screening question each, so a maximum
  // intake has to open them or half the instrument scores zero.
  hasCognitiveIssues: true,
  hasBehaviourIssues: true,
  hasIncontinence: true,
  hasStomaOrCatheter: true,
  hasTubeFeeding: true,
  hasMedicalMeasures: true,
  // Deliberately false. This one gates no criterion, so it does not widen the
  // intake; it short-circuits the grade instead. Turning it on here would make
  // every maximum-intake assertion pass for the wrong reason.
  hasLimbUnusability: false,
};

/** Every applicable criterion answered at its most dependent level. */
function maxIntake(): IntakeAnswers {
  const a = emptyIntake();
  a.conditions = { ...allConditions };
  for (const c of CRITERIA) {
    // 4.13 has three outcomes and its highest-scoring one is index 1, not the last.
    a.levels[c.id] =
      c.scale === 'tubeFeeding'
        ? c.points.indexOf(Math.max(...c.points))
        : c.points.length - 1;
  }
  return a;
}

describe('criteria registry matches the conversion tables', () => {
  it.each([
    ['m1', 15],
    ['m2', 33],
    ['m3', 65],
    ['m4', 54],
    ['m6', 18],
  ] as Array<[ModuleId, number]>)(
    '%s criteria at maximum sum to exactly %i raw points',
    (module, expected) => {
      const sum = criteriaFor(module).reduce(
        (total, c) => total + Math.max(...c.points),
        0,
      );
      expect(sum).toBe(expected);
      // ...and that is exactly what the NBA conversion table expects.
      expect(sum).toBe(MODULES[module].maxRaw);
    },
  );

  it('has the official number of criteria in each module', () => {
    expect(criteriaFor('m1')).toHaveLength(5);
    expect(criteriaFor('m2')).toHaveLength(11);
    expect(criteriaFor('m3')).toHaveLength(13);
    expect(criteriaFor('m4')).toHaveLength(13);
    expect(criteriaFor('m6')).toHaveLength(6);
    expect(M5_CRITERIA).toHaveLength(16);
  });

  it('uses unique, correctly prefixed criterion ids', () => {
    const ids = CRITERIA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CRITERIA) {
      expect(c.id.startsWith(c.module.slice(1) + '.')).toBe(true);
    }
  });

  it('spreads weighted criteria evenly and in whole points', () => {
    const essen = CRITERIA.find((c) => c.id === '4.8')!;
    expect(essen.points).toEqual([0, 3, 6, 9]);
    const trinken = CRITERIA.find((c) => c.id === '4.9')!;
    expect(trinken.points).toEqual([0, 2, 4, 6]);
    const toilette = CRITERIA.find((c) => c.id === '4.10')!;
    expect(toilette.points).toEqual([0, 2, 4, 6]);
  });
});

describe('end to end: intake feeds the assessment', () => {
  it('tops out at Pflegegrad 4 when no medical measures are reported', () => {
    const { raw } = scoreIntake(maxIntake());
    expect(raw).toEqual({ m1: 15, m2: 33, m3: 65, m4: 54, m5: 0, m6: 18 });

    // 10 + 15 (higher of m2/m3) + 40 + 0 + 15 = 80.
    // Worth stating plainly: total dependence in every other respect still
    // falls short of Pflegegrad 5. Module 5 carries 20 of the 100 points, so a
    // household that skips the medical questions caps out one grade low. The
    // intake must not let that happen silently.
    const result = assess(raw);
    expect(result.totalWeighted).toBe(80);
    expect(result.grade).toBe(4);
    expect(result.pointsToNextGrade).toBe(10);
  });

  it('reaches 100 points and Pflegegrad 5 once medical measures are included', () => {
    const a = maxIntake();
    a.frequencies['5.1'] = { count: 9, per: 'day' };
    a.frequencies['5.8'] = { count: 3, per: 'day' };
    a.frequencies['5.12'] = { count: 1, per: 'day' };
    a.dietLevel = 3;

    const { raw } = scoreIntake(a);
    expect(raw.m5).toBe(15);

    const result = assess(raw);
    expect(result.totalWeighted).toBe(100);
    expect(result.grade).toBe(5);
  });

  it('an empty intake produces no grade rather than a guess', () => {
    const { raw, completeness } = scoreIntake(emptyIntake());
    expect(raw).toEqual({ m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 });
    expect(assess(raw).grade).toBe(0);
    expect(completeness).toBe(0);
  });

  it('scores unanswered criteria as zero, never as an average', () => {
    const a = emptyIntake();
    a.levels['4.8'] = 3; // eating: fully dependent, 9 points
    const { raw } = scoreIntake(a);
    expect(raw.m4).toBe(9);
  });
});

describe('conditional criteria', () => {
  it('skips incontinence and tube feeding unless the household says they apply', () => {
    const a = emptyIntake();
    expect(isApplicable(CRITERIA.find((c) => c.id === '4.11')!, a.conditions)).toBe(false);
    expect(isApplicable(CRITERIA.find((c) => c.id === '4.13')!, a.conditions)).toBe(false);

    a.conditions.hasIncontinence = true;
    expect(isApplicable(CRITERIA.find((c) => c.id === '4.11')!, a.conditions)).toBe(true);
    expect(isApplicable(CRITERIA.find((c) => c.id === '4.13')!, a.conditions)).toBe(false);
  });

  it('keeps skipped criteria out of the completeness figure', () => {
    const a = emptyIntake();
    for (const c of CRITERIA) {
      if (isApplicable(c, a.conditions)) a.levels[c.id] = 0;
    }
    const { coverage, completeness } = scoreIntake(a);
    // Every in-scope criterion answered, so the intake reads as complete even
    // though three criteria were never shown.
    expect(completeness).toBe(1);
    const m4 = coverage.find((c) => c.module === 'm4')!;
    expect(m4.applicable).toBe(10);
  });

  it('lists only unanswered, in-scope criteria as remaining', () => {
    const a = emptyIntake();
    // Out of scope until their gates are answered: the two incontinence
    // criteria, tube feeding, and the whole of modules 2 and 3.
    const gated = 3 + criteriaFor('m2').length + criteriaFor('m3').length;
    expect(remainingCriteria(a)).toHaveLength(CRITERIA.length - gated);
    a.conditions.hasIncontinence = true;
    expect(remainingCriteria(a)).toHaveLength(CRITERIA.length - gated + 2);
  });

  it('gates the module 5 rows that presuppose a stoma, catheter or incontinence', () => {
    const stoma = M5_CRITERIA.find((c) => c.id === '5.9')!;
    const bowel = M5_CRITERIA.find((c) => c.id === '5.10')!;
    const medication = M5_CRITERIA.find((c) => c.id === '5.1')!;

    const a = emptyIntake();
    expect(isM5Applicable(stoma, a.conditions)).toBe(false);
    expect(isM5Applicable(bowel, a.conditions)).toBe(false);
    // An ungated row is asked of every household.
    expect(isM5Applicable(medication, a.conditions)).toBe(true);

    // Bowel management stands on incontinence alone, no stoma required.
    a.conditions.hasIncontinence = true;
    expect(isM5Applicable(bowel, a.conditions)).toBe(true);
    expect(isM5Applicable(stoma, a.conditions)).toBe(false);

    a.conditions.hasStomaOrCatheter = true;
    expect(isM5Applicable(stoma, a.conditions)).toBe(true);
  });

  it('ignores a module 5 frequency once its gating answer no longer holds', () => {
    // A household reports stoma care, then corrects the gating answer. The
    // stale frequency must stop scoring rather than quietly inflating module 5.
    const a = emptyIntake();
    a.conditions.hasStomaOrCatheter = true;
    a.frequencies['5.9'] = { count: 3, per: 'day' };
    expect(scoreModule5(a)).toBe(3);

    a.conditions.hasStomaOrCatheter = false;
    expect(scoreModule5(a)).toBe(0);
  });
});

describe('module 5 group aggregation', () => {
  it.each([
    [0, 0],
    [0.9, 0],
    [1, 1],
    [3, 1],
    [3.1, 2],
    [8, 2],
    [8.1, 3],
    [40, 3],
  ])('pooled daily frequency %s -> %i points', (total, points) => {
    expect(scoreM5Daily(total)).toBe(points);
  });

  it.each([
    [0, 0],
    [1 / 8, 0],
    [1 / 7, 1],
    [0.9, 1],
    [1, 2],
    [2.9, 2],
    [3, 3],
  ])('pooled weekly frequency %s per day -> %i points', (perDay, points) => {
    expect(scoreM5Weekly(perDay)).toBe(points);
  });

  it.each([
    [0, 0],
    [4.2, 0],
    [4.3, 1],
    [8.5, 1],
    [8.6, 2],
    [12.8, 2],
    [12.9, 3],
    [59, 3],
    [60, 6],
    [120, 6],
  ])('accumulated intensive points %s -> %i points', (acc, points) => {
    expect(scoreM5Intensive(acc)).toBe(points);
  });

  it('pools frequencies across criteria rather than scoring each alone', () => {
    const a = emptyIntake();
    // Two separate measures, twice a day each: four a day pooled, which lands
    // in the 4–8 band. Scored individually each would only reach band 1.
    a.frequencies['5.1'] = { count: 2, per: 'day' };
    a.frequencies['5.2'] = { count: 2, per: 'day' };
    expect(scoreModule5(a)).toBe(2);
  });

  it('converts weeks and months to a daily average', () => {
    const a = emptyIntake();
    a.frequencies['5.1'] = { count: 7, per: 'week' }; // once a day
    expect(scoreModule5(a)).toBe(1);

    const b = emptyIntake();
    b.frequencies['5.1'] = { count: 15, per: 'month' }; // half a day
    expect(scoreModule5(b)).toBe(0);
  });

  it('weights the time-intensive criteria at two points per occurrence', () => {
    const a = emptyIntake();
    a.frequencies['5.13'] = { count: 5, per: 'month' }; // factor 1 -> 5 points
    expect(scoreM5Intensive(5)).toBe(1);
    expect(scoreModule5(a)).toBe(1);

    const b = emptyIntake();
    b.frequencies['5.12'] = { count: 5, per: 'month' }; // factor 2 -> 10 points
    expect(scoreModule5(b)).toBe(2);
  });

  it('reaches the module maximum of 15 for continuous invasive support', () => {
    const a = emptyIntake();
    a.frequencies['5.1'] = { count: 9, per: 'day' }; // daily group -> 3
    a.frequencies['5.8'] = { count: 3, per: 'day' }; // weekly group -> 3
    a.frequencies['5.12'] = { count: 1, per: 'day' }; // 30 * 2 = 60 -> 6
    a.dietLevel = 3; // -> 3
    expect(scoreModule5(a)).toBe(15);
  });

  it('never exceeds the module maximum', () => {
    const a = emptyIntake();
    for (const c of M5_CRITERIA) a.frequencies[c.id] = { count: 50, per: 'day' };
    a.dietLevel = 3;
    expect(scoreModule5(a)).toBeLessThanOrEqual(15);
  });
});

describe('criterion 4.13 (tube feeding)', () => {
  it('scores highest when tube feeding supplements eating by mouth', () => {
    const a = emptyIntake();
    a.conditions.hasTubeFeeding = true;

    a.levels['4.13'] = 1; // daily, alongside oral intake
    expect(scoreIntake(a).raw.m4).toBe(6);

    a.levels['4.13'] = 2; // almost entirely by tube
    expect(scoreIntake(a).raw.m4).toBe(3);

    a.levels['4.13'] = 0;
    expect(scoreIntake(a).raw.m4).toBe(0);
  });
});

describe('assessIntake carries the besondere Bedarfskonstellation', () => {
  it('reaches Pflegegrad 5 from the gating answer alone', () => {
    // Nothing else answered: without the constellation this is no Pflegegrad at
    // all, which is what makes the wiring worth a test of its own.
    const a = emptyIntake();
    expect(assessIntake(a).assessment.grade).toBe(0);

    a.conditions.hasLimbUnusability = true;
    const { assessment } = assessIntake(a);
    expect(assessment.grade).toBe(5);
    expect(assessment.viaBedarfskonstellation).toBe(true);
    expect(assessment.gradeFromPoints).toBe(0);
  });

  it('agrees with assess() called by hand, which is the drift this guards', () => {
    const a = emptyIntake();
    a.conditions.hasLimbUnusability = true;
    a.levels['1.5'] = 3;

    const viaHelper = assessIntake(a).assessment;
    const viaParts = assess(scoreIntake(a).raw, { limbUnusability: true });
    expect(viaHelper).toEqual(viaParts);
  });
});

describe('the answers read back in the order the Begutachtung works', () => {
  /**
   * A full intake, so every module is represented in the output.
   */
  const filled = (): IntakeAnswers => {
    const a = emptyIntake();
    for (const id of [
      'hasCognitiveIssues',
      'hasBehaviourIssues',
      'hasIncontinence',
      'hasStomaOrCatheter',
      'hasTubeFeeding',
      'hasMedicalMeasures',
    ] as const) {
      a.conditions[id] = true;
    }
    for (const c of CRITERIA) {
      if (isApplicable(c, a.conditions)) a.levels[c.id] = 1;
    }
    a.m5 = { daily: 2, weekly: 1, intensive: 1 };
    a.dietLevel = 1;
    return a;
  };

  it('walks the modules in numerical order, with module 5 before module 6', () => {
    const lines = answerLines(filled(), { lang: 'de', plain: false });
    const seen: string[] = [];
    for (const l of lines) {
      if (l.module && seen[seen.length - 1] !== l.module) seen.push(l.module);
    }
    expect(seen).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
  });

  it('never returns to a module it has already left', () => {
    const lines = answerLines(filled(), { lang: 'de', plain: false });
    const order = lines.filter((l) => l.module).map((l) => l.module!);
    const firstSeen = new Map<string, number>();
    order.forEach((m, i) => {
      if (!firstSeen.has(m)) firstSeen.set(m, i);
    });
    for (let i = 1; i < order.length; i++) {
      if (order[i] === order[i - 1]) continue;
      expect(firstSeen.get(order[i])).toBe(i);
    }
  });

  it('names every module it tags, in the reader’s language', () => {
    for (const lang of ['de', 'en'] as const) {
      for (const l of answerLines(filled(), { lang, plain: false })) {
        if (l.module) expect(l.moduleName, `${l.module} in ${lang}`).toBeTruthy();
      }
    }
  });

  it('leaves the gating questions untagged, ahead of module 1', () => {
    const lines = answerLines(filled(), { lang: 'de', plain: false });
    const firstTagged = lines.findIndex((l) => l.module);
    expect(firstTagged).toBeGreaterThan(0);
    expect(lines.slice(0, firstTagged).every((l) => l.module === undefined)).toBe(true);
  });
});
