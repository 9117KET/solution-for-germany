import { describe, it, expect } from 'vitest';
import { CRITERIA, criteriaFor, type ConditionId } from './criteria';
import { GROUPS, groupMaxPoints, groupedCriterionIds, membersOf } from './groups';
import {
  assessIntake,
  emptyIntake,
  scoreModule5,
  type IntakeAnswers,
} from './score';
import {
  askableId,
  canChangeOutcome,
  coverageOf,
  fullPlan,
  gradeBounds,
  isAnswered,
  isAskable,
  remainingAskables,
  worstLevel,
  type Askable,
} from './adaptive';
import { MODULES, type ModuleId } from '../rules/nba';

// --------------------------------------------------------------- fixtures

/**
 * A household, described completely: what a full official assessment would
 * have recorded. The simulations below answer the adaptive intake out of one
 * of these and check that the short run lands where the long run would.
 */
interface Profile {
  conditions: Record<ConditionId, boolean>;
  /** Level index per criterion id. */
  levels: Record<string, number>;
  m5: { daily: number; weekly: number; intensive: number };
  dietLevel: number;
}

const conditions = (over: Partial<Record<ConditionId, boolean>> = {}) => ({
  hasCognitiveIssues: false,
  hasBehaviourIssues: false,
  hasIncontinence: false,
  hasStomaOrCatheter: false,
  hasTubeFeeding: false,
  hasMedicalMeasures: false,
  hasLimbUnusability: false,
  ...over,
});

/** Everyone at one level, which is the cheapest way to describe an extreme. */
function uniform(level: number, over: Partial<Profile> = {}): Profile {
  const levels: Record<string, number> = {};
  for (const c of CRITERIA) levels[c.id] = Math.min(level, c.points.length - 1);
  return {
    conditions: conditions(),
    levels,
    m5: { daily: 0, weekly: 0, intensive: 0 },
    dietLevel: 0,
    ...over,
  };
}

/** The intake answers a full official assessment of this profile would hold. */
function fullAnswers(p: Profile): IntakeAnswers {
  return {
    conditions: { ...p.conditions },
    levels: { ...p.levels },
    frequencies: {},
    m5: { ...p.m5 },
    dietLevel: p.dietLevel,
  };
}

/** Answer one question the way this profile would. */
function answer(a: Askable, p: Profile, answers: IntakeAnswers): IntakeAnswers {
  switch (a.kind) {
    case 'condition':
      return { ...answers, conditions: { ...answers.conditions, [a.id]: p.conditions[a.id] } };
    case 'group': {
      // Answered member by member, the least forgiving case: it holds the
      // stopping rule to account without the grouping to help it.
      const levels = { ...answers.levels };
      for (const c of membersOf(a.group)) levels[c.id] = p.levels[c.id];
      return { ...answers, levels };
    }
    case 'm5band':
      return { ...answers, m5: { ...answers.m5, [a.id]: p.m5[a.id] } };
    case 'm5diet':
      return { ...answers, dietLevel: p.dietLevel };
  }
}

/** Walk the adaptive intake to its end, counting the screens it put up. */
function run(p: Profile): { answers: IntakeAnswers; asked: string[] } {
  let answers = emptyIntake();
  const asked: string[] = [];
  // The plan is finite and every step answers one previously unanswered
  // question, so this cannot spin; the bound is a guard against a future edit
  // that makes `remainingAskables` return something already answered.
  for (let guard = 0; guard < fullPlan().length + 5; guard += 1) {
    const remaining = remainingAskables(answers);
    if (remaining.length === 0) break;
    const next = remaining[0];
    asked.push(askableId(next));
    answers = answer(next, p, answers);
  }
  return { answers, asked };
}

// ------------------------------------------------------------------ groups

describe('the grouped questions cover the instrument exactly', () => {
  it('puts every scored criterion in exactly one group', () => {
    const grouped = groupedCriterionIds();
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(CRITERIA.map((c) => c.id)));
  });

  it('keeps every module worth exactly what the conversion table expects', () => {
    for (const moduleId of ['m1', 'm2', 'm3', 'm4', 'm6'] as ModuleId[]) {
      const viaGroups = GROUPS.filter((g) => g.module === moduleId).reduce(
        (sum, g) => sum + groupMaxPoints(g),
        0,
      );
      expect(viaGroups).toBe(MODULES[moduleId].maxRaw);
    }
  });

  it('never mixes answer scales inside one group', () => {
    for (const g of GROUPS) {
      for (const c of membersOf(g)) expect(c.scale).toBe(g.scale);
    }
  });

  it('gates a group exactly as its members are gated', () => {
    for (const g of GROUPS) {
      for (const c of membersOf(g)) expect(c.dependsOn).toBe(g.dependsOn);
    }
  });

  it('names groups uniquely and keeps them inside one module', () => {
    const ids = GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GROUPS) {
      for (const c of membersOf(g)) expect(c.module).toBe(g.module);
    }
  });

  it('asks the heaviest self-care criteria on their own rather than pooled', () => {
    // Eating is 9 raw points, a sixth of module 4. Pooling it with anything
    // would let one careless answer move the grade.
    for (const id of ['4.8', '4.9', '4.10']) {
      const g = GROUPS.find((x) => x.members.includes(id))!;
      expect(g.members).toEqual([id]);
    }
  });
});

// ------------------------------------------------------------------ bounds

describe('the grade bounds bracket the truth', () => {
  it('spans every grade before anything at all is known', () => {
    const b = gradeBounds(emptyIntake());
    expect(b.low).toBe(0);
    expect(b.high).toBe(5);
    expect(b.resolved).toBe(false);
  });

  it.each([
    ['nobody needing help', uniform(0)],
    ['mild dependence throughout', uniform(1)],
    ['heavy dependence throughout', uniform(2)],
    [
      'total dependence with medical care',
      uniform(3, {
        conditions: conditions({
          hasCognitiveIssues: true,
          hasBehaviourIssues: true,
          hasIncontinence: true,
          hasTubeFeeding: true,
          hasMedicalMeasures: true,
        }),
        m5: { daily: 3, weekly: 3, intensive: 6 },
        dietLevel: 3,
      }),
    ],
  ])('contains the full-intake grade at every step, for %s', (_name, profile) => {
    const truth = assessIntake(fullAnswers(profile)).assessment.grade;
    let answers = emptyIntake();

    for (const a of fullPlan()) {
      const b = gradeBounds(answers);
      // The invariant the whole design rests on. If this ever fails, the
      // intake can stop early on a grade that is simply wrong.
      expect(b.low).toBeLessThanOrEqual(truth);
      expect(b.high).toBeGreaterThanOrEqual(truth);
      if (isAskable(a, answers) && !isAnswered(a, answers)) {
        answers = answer(a, profile, answers);
      }
    }

    const end = gradeBounds(answers);
    expect(end.resolved).toBe(true);
    expect(end.low).toBe(truth);
  });

  it('never widens as answers come in', () => {
    const profile = uniform(2, {
      conditions: conditions({ hasCognitiveIssues: true, hasMedicalMeasures: true }),
      m5: { daily: 2, weekly: 1, intensive: 1 },
      dietLevel: 1,
    });
    let answers = emptyIntake();
    let previous = gradeBounds(answers);

    for (const a of fullPlan()) {
      if (!isAskable(a, answers) || isAnswered(a, answers)) continue;
      answers = answer(a, profile, answers);
      const next = gradeBounds(answers);
      expect(next.low).toBeGreaterThanOrEqual(previous.low);
      expect(next.high).toBeLessThanOrEqual(previous.high);
      previous = next;
    }
  });

  it('treats an unanswered gate as unknown, not as a no', () => {
    // Nothing said about medical measures: module 5's twenty points are still
    // in play, so the ceiling has to allow for them.
    const open = gradeBounds(emptyIntake());
    const shut = gradeBounds({ ...emptyIntake(), conditions: { hasMedicalMeasures: false } });
    expect(shut.highPoints).toBeLessThan(open.highPoints);
  });

  it('keeps Pflegegrad 5 reachable until the limb question is answered', () => {
    // The besondere Bedarfskonstellation does not go through the points, so a
    // ceiling that ignored it could settle on 4 for a household entitled to 5.
    const unasked = gradeBounds(uniformAnswers(0, {}));
    expect(unasked.high).toBe(5);
    const said = gradeBounds(uniformAnswers(0, { hasLimbUnusability: false }));
    expect(said.high).toBeLessThan(5);
  });
});

/** Every criterion answered at one level, with the given gating answers. */
function uniformAnswers(
  level: number,
  over: Partial<Record<ConditionId, boolean>>,
): IntakeAnswers {
  const a = emptyIntake();
  a.conditions = { ...over };
  for (const c of CRITERIA) {
    if (c.dependsOn === undefined) a.levels[c.id] = Math.min(level, c.points.length - 1);
  }
  return a;
}

// ------------------------------------------------------------------ stopping

describe('the intake stops when, and only when, the grade is settled', () => {
  const cases: Array<[string, Profile]> = [
    ['a household needing no help', uniform(0)],
    ['mild dependence', uniform(1)],
    [
      'moderate dependence with memory problems',
      uniform(2, {
        conditions: conditions({ hasCognitiveIssues: true, hasMedicalMeasures: true }),
        m5: { daily: 2, weekly: 1, intensive: 1 },
        dietLevel: 1,
      }),
    ],
    [
      'total dependence',
      uniform(3, {
        conditions: conditions({
          hasCognitiveIssues: true,
          hasBehaviourIssues: true,
          hasIncontinence: true,
          hasTubeFeeding: true,
          hasMedicalMeasures: true,
        }),
        m5: { daily: 3, weekly: 3, intensive: 6 },
        dietLevel: 3,
      }),
    ],
    [
      'unusable limbs and nothing else reported',
      uniform(0, { conditions: conditions({ hasLimbUnusability: true }) }),
    ],
  ];

  it.each(cases)('reaches the full-intake grade for %s', (_name, profile) => {
    const truth = assessIntake(fullAnswers(profile)).assessment.grade;
    const { answers } = run(profile);
    const b = gradeBounds(answers);
    expect(b.resolved).toBe(true);
    expect(b.low).toBe(truth);
  });

  it.each(cases)('never leaves a question unasked while %s is unsettled', (_name, profile) => {
    const { answers } = run(profile);
    // Either the grade is settled, or there was nothing left to ask. The
    // failure this guards is stopping early on a range.
    expect(gradeBounds(answers).resolved).toBe(true);
  });

  it('asks far fewer questions than the official instrument contains', () => {
    for (const [, profile] of cases) {
      const { asked } = run(profile);
      const coverage = coverageOf(run(profile).answers);
      expect(coverage.officialQuestions).toBe(64);
      // The claim the product makes, pinned. Even the household that answers
      // yes to every gate stays well under half the official count.
      expect(asked.length).toBeLessThan(32);
    }
  });

  it('asks a household with no gated impairments barely twenty questions', () => {
    const { asked } = run(uniform(1));
    expect(asked.length).toBeLessThanOrEqual(20);
    // ...and none of them is about memory, behaviour or medical care.
    expect(asked.filter((id) => id.startsWith('g2.') || id.startsWith('g3.'))).toEqual([]);
    expect(asked.filter((id) => id.startsWith('m5.'))).toEqual([]);
  });

  it('stops asking about behaviour once cognition has taken the shared slot', () => {
    // Modules 2 and 3 compete for one 15-point allocation. Once module 2 is at
    // its maximum, no answer about behaviour can move the total by a point,
    // and thirteen questions drop away.
    const a = emptyIntake();
    a.conditions = { hasCognitiveIssues: true, hasBehaviourIssues: true };
    for (const c of criteriaFor('m2')) a.levels[c.id] = 3; // raw 33, weighted 15

    for (const g of GROUPS.filter((x) => x.module === 'm3')) {
      const askable: Askable = { kind: 'group', id: g.id, group: g };
      expect(canChangeOutcome(askable, a)).toBe(false);
    }
    expect(remainingAskables(a).filter((x) => askableId(x).startsWith('g3.'))).toEqual([]);
  });

  it('still asks about behaviour when cognition leaves room', () => {
    const a = emptyIntake();
    a.conditions = { hasCognitiveIssues: true, hasBehaviourIssues: true };
    for (const c of criteriaFor('m2')) a.levels[c.id] = 0; // raw 0, weighted 0
    expect(remainingAskables(a).some((x) => askableId(x).startsWith('g3.'))).toBe(true);
  });

  it('offers nothing further once the grade is settled', () => {
    const settled = fullAnswers(uniform(3, {
      conditions: conditions({
        hasCognitiveIssues: true,
        hasBehaviourIssues: true,
        hasIncontinence: true,
        hasTubeFeeding: true,
        hasMedicalMeasures: true,
      }),
      m5: { daily: 3, weekly: 3, intensive: 6 },
      dietLevel: 3,
    }));
    expect(gradeBounds(settled).resolved).toBe(true);
    expect(remainingAskables(settled)).toEqual([]);
  });
});

// ------------------------------------------------------------------ module 5

describe('module 5 asked as bands scores what the sixteen rows scored', () => {
  it.each([
    [{ daily: 0, weekly: 0, intensive: 0 }, 0, 0],
    [{ daily: 1, weekly: 0, intensive: 0 }, 0, 1],
    [{ daily: 2, weekly: 1, intensive: 1 }, 1, 5],
    [{ daily: 3, weekly: 3, intensive: 6 }, 3, 15],
  ])('bands %o with diet %i score %i', (m5, dietLevel, expected) => {
    expect(scoreModule5({ ...emptyIntake(), m5, dietLevel })).toBe(expected);
  });

  it('matches the long form row by row', () => {
    // The same household described twice: once as frequencies, once as the
    // bands those frequencies pool into. Both must produce one number.
    const long = emptyIntake();
    long.frequencies['5.1'] = { count: 2, per: 'day' };
    long.frequencies['5.2'] = { count: 2, per: 'day' }; // pooled 4/day -> band 2
    long.frequencies['5.8'] = { count: 1, per: 'day' }; // -> band 2
    long.frequencies['5.13'] = { count: 5, per: 'month' }; // 5 points -> band 1
    long.dietLevel = 1;

    const short: IntakeAnswers = {
      ...emptyIntake(),
      m5: { daily: 2, weekly: 2, intensive: 1 },
      dietLevel: 1,
    };
    expect(scoreModule5(short)).toBe(scoreModule5(long));
  });

  it('keeps honouring a session saved as frequencies', () => {
    // No bands present, so the pooled rows still decide. This is what stops an
    // in-progress intake from an older version silently scoring zero.
    const stored = emptyIntake();
    stored.frequencies['5.1'] = { count: 9, per: 'day' };
    expect(scoreModule5(stored)).toBe(3);
  });

  it('clamps a band that a hand-edited session put out of range', () => {
    const forged: IntakeAnswers = {
      ...emptyIntake(),
      m5: { daily: 99, weekly: 99, intensive: 99 },
      dietLevel: 99,
    };
    // Each band clamped to its own maximum: 3 + 3 + 6 + 3, which is the
    // module maximum and not a point more.
    expect(scoreModule5(forged)).toBe(15);
  });
});

// ------------------------------------------------------------------ plan

describe('the plan', () => {
  it('opens with the screening question, not with whatever survives a filter', () => {
    // The bug this pins: early on, no single question changes the grade
    // bounds, because the other unanswered ones hold the ceiling at 5 and the
    // floor at 0 by themselves. A prune rule written on grades alone dropped
    // every screening question and opened the intake with "are both arms and
    // both legs unusable", as question 1 of 4.
    const first = remainingAskables(emptyIntake())[0];
    expect(askableId(first)).toBe('hasCognitiveIssues');
  });

  it('keeps every gating question, whatever the bounds say', () => {
    // A gate decides whether other questions exist at all, so pruning one
    // closes a module rather than skipping a screen.
    const a = emptyIntake();
    for (const id of ['hasCognitiveIssues', 'hasBehaviourIssues', 'hasIncontinence', 'hasMedicalMeasures'] as ConditionId[]) {
      expect(canChangeOutcome({ kind: 'condition', id }, a)).toBe(true);
    }
  });

  it('asks the screening questions before anything they gate', () => {
    const plan = fullPlan();
    const at = (id: string) => plan.findIndex((a) => askableId(a) === id);
    expect(at('hasCognitiveIssues')).toBeLessThan(at('g2.memory'));
    expect(at('hasBehaviourIssues')).toBeLessThan(at('g3.restless'));
    expect(at('hasIncontinence')).toBeLessThan(at('g4.incontinence'));
    expect(at('hasMedicalMeasures')).toBeLessThan(at('m5.daily'));
    expect(at('hasTubeFeeding')).toBeLessThan(at('g4.tube'));
  });

  it('spends its first questions on the module worth forty points', () => {
    const plan = fullPlan();
    const firstGroup = plan.find((a) => a.kind === 'group')!;
    expect(firstGroup.kind === 'group' && firstGroup.group.module).toBe('m4');
  });

  it('names every askable exactly once', () => {
    const ids = fullPlan().map(askableId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reports how much of the instrument was skipped', () => {
    const { answers, asked } = run(uniform(1));
    const c = coverageOf(answers);
    expect(c.asked).toBe(asked.length);
    expect(c.bounds.resolved).toBe(true);
    // Everything modules 2 and 3 contain, at the very least: both were gated
    // shut, and the run settled the grade before the rest ran out.
    expect(c.skipped).toBeGreaterThanOrEqual(
      criteriaFor('m2').length + criteriaFor('m3').length,
    );
    expect(c.skipped + Object.keys(answers.levels).length).toBe(CRITERIA.length);
  });
});

describe('worstLevel', () => {
  it('is the last level for an ordinary criterion', () => {
    expect(worstLevel(CRITERIA.find((c) => c.id === '4.8')!)).toBe(3);
  });

  it('is the middle option for tube feeding, whose scale is not ordered', () => {
    // 4.13 scores 0, 6, 3: feeding by tube alongside eating by mouth is the
    // heaviest, not feeding almost entirely by tube.
    expect(worstLevel(CRITERIA.find((c) => c.id === '4.13')!)).toBe(1);
  });
});
