/**
 * Stop asking once the answer can no longer change.
 *
 * Every unanswered question is a range, not a blank. A criterion nobody has
 * answered yet is worth somewhere between zero points and its maximum, and
 * running the official arithmetic twice, once assuming the best of every
 * unanswered question and once assuming the worst, brackets the grade:
 *
 *     low  = the grade if everything still unasked turns out to need no help
 *     high = the grade if everything still unasked turns out to need full help
 *
 * When those two agree, the remaining questions cannot change the outcome and
 * the intake is over, whatever fraction of the instrument has been covered. A
 * household whose self-care answers already put it past 70 points does not need
 * to be walked through social contacts to be told it is Pflegegrad 4.
 *
 * This is sound because the assessment is monotonic: every module's conversion
 * table is non-decreasing in its raw score, the total is a sum of module
 * scores (with modules 2 and 3 taking the higher of the two, which is also
 * monotonic), and the grade thresholds are non-decreasing in the total. So the
 * true grade always lies between the two bounds, and when they coincide the
 * true grade is known exactly rather than estimated.
 *
 * Two consequences worth being explicit about:
 *
 *  - Where the bounds coincide, the result is not "an estimate from a partial
 *    intake". It is the same grade the full intake would have produced from
 *    these answers. The report may say so.
 *  - Where they do not coincide and the questions run out, the honest output is
 *    a range, and the report shows a range. It never picks the midpoint, and it
 *    never quietly reports the low end as though it were the answer.
 */

import { assess, MODULES, type ModuleId, type Pflegegrad, type RawScores } from '../rules/nba';
import { CRITERIA, type ConditionId, type Criterion } from './criteria';
import {
  GROUPS,
  groupAnswered,
  groupMaxPoints,
  membersOf,
  type CriterionGroup,
} from './groups';
import { M5_INTENSIVE_BANDS, type IntakeAnswers } from './score';

// --------------------------------------------------------------- askables

/** A module 5 band, asked directly instead of as its underlying rows. */
export type M5BandId = 'daily' | 'weekly' | 'intensive';

/**
 * One thing the intake can ask.
 *
 * Gating questions are askables like any other, because they carry range in
 * exactly the same way: until someone says whether there are memory problems,
 * module 2 is worth between nothing and its full fifteen points.
 */
export type Askable =
  | { kind: 'condition'; id: ConditionId }
  | { kind: 'group'; id: string; group: CriterionGroup }
  | { kind: 'm5band'; id: M5BandId }
  | { kind: 'm5diet' };

export const askableId = (a: Askable): string =>
  a.kind === 'group' ? a.id : a.kind === 'm5band' ? `m5.${a.id}` : a.kind === 'm5diet' ? 'm5.diet' : a.id;

/**
 * The screening questions, in the order they are asked.
 *
 * Five yes/no answers that between them decide whether 24 of the instrument's
 * 48 criteria get asked at all. `hasStomaOrCatheter` is deliberately not among
 * them: it gated nothing but two module 5 rows, and module 5 is now asked as
 * pooled bands, so it had become a question whose answer could not reach the
 * arithmetic. The condition itself is kept so that sessions saved by earlier
 * versions still parse.
 */
export const SCREENING: readonly ConditionId[] = [
  'hasCognitiveIssues',
  'hasBehaviourIssues',
  'hasIncontinence',
  'hasMedicalMeasures',
  'hasLimbUnusability',
];

/**
 * Modules in descending order of what they are worth.
 *
 * Self-care is 40 of the 100 points and goes first, so the bounds close as
 * fast as they can and the intake has the best chance of ending early. Mobility
 * is 10 and goes last. Modules 2 and 3 share one 15-point slot, and 2 is asked
 * first because it is the one reported when they tie.
 */
const MODULE_ORDER: readonly ModuleId[] = ['m4', 'm5', 'm2', 'm3', 'm6', 'm1'];

/**
 * Every askable, in the order the intake would ask them if nothing resolved.
 *
 * Tube feeding is asked inside the self-care block rather than up front with
 * the other screening questions: it gates a single criterion, and putting it
 * with the general ones would spend a question on almost every household to
 * serve a handful. The groups it gates follow it immediately.
 */
export function fullPlan(): Askable[] {
  const out: Askable[] = SCREENING.map((id) => ({ kind: 'condition', id }) as const);

  for (const moduleId of MODULE_ORDER) {
    if (moduleId === 'm5') {
      out.push({ kind: 'm5band', id: 'daily' });
      out.push({ kind: 'm5band', id: 'weekly' });
      out.push({ kind: 'm5band', id: 'intensive' });
      out.push({ kind: 'm5diet' });
      continue;
    }
    for (const g of GROUPS.filter((x) => x.module === moduleId)) {
      if (g.dependsOn === 'hasTubeFeeding') {
        out.push({ kind: 'condition', id: 'hasTubeFeeding' });
      }
      out.push({ kind: 'group', id: g.id, group: g });
    }
  }
  return out;
}

// ------------------------------------------------------------- applicable

/**
 * Gate state as three values, not two.
 *
 * `undefined` is not "no". A criterion whose gate has not been answered is not
 * out of scope, it is unknown, and the high bound has to keep counting it or
 * the intake would congratulate itself on resolving a grade it had merely
 * stopped asking about.
 */
function gateState(
  dependsOn: ConditionId | undefined,
  conditions: IntakeAnswers['conditions'],
): boolean | undefined {
  return dependsOn === undefined ? true : conditions[dependsOn];
}

/** Is this askable one the household should currently see? */
export function isAskable(a: Askable, answers: IntakeAnswers): boolean {
  switch (a.kind) {
    case 'condition':
      return true;
    case 'group':
      return gateState(a.group.dependsOn, answers.conditions) === true;
    case 'm5band':
    case 'm5diet':
      return answers.conditions.hasMedicalMeasures === true;
  }
}

export function isAnswered(a: Askable, answers: IntakeAnswers): boolean {
  switch (a.kind) {
    case 'condition':
      return answers.conditions[a.id] !== undefined;
    case 'group':
      return groupAnswered(a.group, answers.levels);
    case 'm5band':
      return answers.m5?.[a.id] !== undefined;
    case 'm5diet':
      return answers.dietLevel !== undefined;
  }
}

// ----------------------------------------------------------------- bounds

const maxPoints = (c: Criterion): number => Math.max(...c.points);

/** The worst-scoring level index of a criterion, which is not always the last. */
export const worstLevel = (c: Criterion): number => c.points.indexOf(maxPoints(c));

function rawBound(answers: IntakeAnswers, worst: boolean): RawScores {
  const raw: RawScores = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };

  for (const c of CRITERIA) {
    const gate = gateState(c.dependsOn, answers.conditions);
    if (gate === false) continue;
    const level = answers.levels[c.id];
    if (gate === true && level !== undefined) {
      raw[c.module] += c.points[Math.max(0, Math.min(c.points.length - 1, level))];
    } else if (worst) {
      raw[c.module] += maxPoints(c);
    }
  }

  if (answers.conditions.hasMedicalMeasures !== false) {
    const band = (v: number | undefined, max: number) =>
      v !== undefined ? Math.max(0, Math.min(max, v)) : worst ? max : 0;
    raw.m5 = Math.min(
      MODULES.m5.maxRaw,
      band(answers.m5?.daily, 3) +
        band(answers.m5?.weekly, 3) +
        band(answers.m5?.intensive, 6) +
        band(answers.dietLevel, 3),
    );
  }

  return raw;
}

export interface GradeBounds {
  /** The grade if every unanswered question turns out to need no help. */
  low: Pflegegrad;
  /** The grade if every unanswered question turns out to need full help. */
  high: Pflegegrad;
  /** Weighted point total at each bound, for showing the working. */
  lowPoints: number;
  highPoints: number;
  /** True where the two agree, which means the grade is settled. */
  resolved: boolean;
}

export function gradeBounds(answers: IntakeAnswers): GradeBounds {
  const limb = answers.conditions.hasLimbUnusability;
  // An unanswered limb question is uncertainty in the same way as any other:
  // it is the one route to Pflegegrad 5 that does not go through the points,
  // so the high bound has to allow for it until somebody says no.
  const low = assess(rawBound(answers, false), { limbUnusability: limb === true });
  const high = assess(rawBound(answers, true), { limbUnusability: limb !== false });
  return {
    low: low.grade,
    high: high.grade,
    lowPoints: low.totalWeighted,
    highPoints: high.totalWeighted,
    resolved: low.grade === high.grade,
  };
}

// ---------------------------------------------------------------- pinning

/** Answers with one askable forced to its least, or most, dependent answer. */
function pin(answers: IntakeAnswers, a: Askable, worst: boolean): IntakeAnswers {
  switch (a.kind) {
    case 'condition':
      return { ...answers, conditions: { ...answers.conditions, [a.id]: worst } };
    case 'group': {
      const levels = { ...answers.levels };
      for (const c of membersOf(a.group)) levels[c.id] = worst ? worstLevel(c) : 0;
      return { ...answers, levels };
    }
    case 'm5band': {
      const max = a.id === 'intensive' ? M5_INTENSIVE_BANDS[M5_INTENSIVE_BANDS.length - 1] : 3;
      return { ...answers, m5: { ...answers.m5, [a.id]: worst ? max : 0 } };
    }
    case 'm5diet':
      return { ...answers, dietLevel: worst ? 3 : 0 };
  }
}

/** Conditions that open or close some other question. */
const GATE_CONDITIONS: ReadonlySet<ConditionId> = new Set(
  fullPlan().flatMap((a) => {
    if (a.kind === 'group' && a.group.dependsOn) return [a.group.dependsOn];
    if (a.kind === 'm5band' || a.kind === 'm5diet') return ['hasMedicalMeasures' as ConditionId];
    return [];
  }),
);

const boundsKey = (b: GradeBounds) => `${b.low}|${b.high}|${b.lowPoints}|${b.highPoints}`;

/**
 * Can this question still move anything?
 *
 * The test is whether answering it at its least dependent end and at its most
 * dependent end leave the bounds *identical*, points included. If they do, the
 * question cannot contribute to the arithmetic from here and is not worth a
 * screen. The case this exists for is module 3 once module 2 has reached the
 * full fifteen points the two of them share: thirteen questions about difficult
 * behaviour that cannot alter the total by a single point.
 *
 * Comparing the whole bounds rather than only the two grades is what keeps this
 * from running wild at the start of an intake. Early on almost nothing changes
 * the *grade* bounds, because the other unanswered questions are holding the
 * ceiling at 5 and the floor at 0 by themselves; a rule that pruned on grades
 * alone would drop nearly every question and open the intake with whichever one
 * happened to survive. Points move long before grades do, so they are what the
 * comparison is made on.
 *
 * Gating questions are never pruned. A gate decides whether other questions
 * exist at all, and its own effect on the bounds is invisible until it is
 * answered, so pruning one would quietly close a module rather than skip a
 * question. This is a structural exemption, not a heuristic.
 *
 * The honest caveat: two questions can each be individually powerless and
 * jointly decisive. So this is only ever used to skip forward, never to declare
 * the intake finished. That decision belongs to `GradeBounds.resolved` alone.
 */
export function canChangeOutcome(a: Askable, answers: IntakeAnswers): boolean {
  const now = gradeBounds(answers);
  if (now.resolved) return false;
  if (a.kind === 'condition' && GATE_CONDITIONS.has(a.id)) return true;
  return (
    boundsKey(gradeBounds(pin(answers, a, false))) !==
    boundsKey(gradeBounds(pin(answers, a, true)))
  );
}

// ------------------------------------------------------------------ plan

/**
 * The questions still worth putting to this household, in order.
 *
 * Already answered, out of scope, or provably unable to change the grade: all
 * three drop out. What is left is the shortest honest remainder of the intake.
 */
export function remainingAskables(answers: IntakeAnswers): Askable[] {
  if (gradeBounds(answers).resolved) return [];
  const open = fullPlan().filter((a) => isAskable(a, answers) && !isAnswered(a, answers));
  const decisive = open.filter((a) => canChangeOutcome(a, answers));
  // The caveat on `canChangeOutcome` made concrete. Two questions can each be
  // individually powerless and jointly decisive, and the filter would then
  // discard both and end an intake whose grade is still a range. Where that
  // happens, the filter is dropped rather than the questions: a few extra
  // screens are a far smaller cost than a range presented as an answer.
  return decisive.length > 0 ? decisive : open;
}

/** How many questions this household has answered, and how many are left. */
export interface Progress {
  answered: number;
  remaining: number;
  /** Answered out of answered-plus-remaining, for a progress bar. */
  fraction: number;
}

export function progressOf(answers: IntakeAnswers): Progress {
  const answered = fullPlan().filter(
    (a) => isAskable(a, answers) && isAnswered(a, answers),
  ).length;
  const remaining = remainingAskables(answers).length;
  const total = answered + remaining;
  return { answered, remaining, fraction: total === 0 ? 1 : answered / total };
}

/**
 * How much shorter this run was than the full instrument.
 *
 * Shown on the report, because "we asked you 18 questions instead of 69 and the
 * answer is the same" is the single most useful thing the tool can say about
 * its own method, and because a family that knows what was skipped can judge
 * whether skipping it was fair.
 */
export interface Coverage {
  /** Scored criteria the official instrument contains, plus its module 5 rows. */
  officialQuestions: number;
  /** Questions this household was actually asked. */
  asked: number;
  /** Criteria that were never put to this household. */
  skipped: number;
  bounds: GradeBounds;
}

export const OFFICIAL_QUESTION_COUNT = CRITERIA.length + 16;

export function coverageOf(answers: IntakeAnswers): Coverage {
  const asked = fullPlan().filter(
    (a) => isAskable(a, answers) && isAnswered(a, answers),
  ).length;
  const answeredCriteria = CRITERIA.filter((c) => answers.levels[c.id] !== undefined).length;
  return {
    officialQuestions: OFFICIAL_QUESTION_COUNT,
    asked,
    skipped: CRITERIA.length - answeredCriteria,
    bounds: gradeBounds(answers),
  };
}

/**
 * Group weights, used only to sanity-check the plan in tests.
 *
 * A module's groups must between them cover every one of its criteria, or points
 * would go missing with no visible symptom.
 */
export function moduleGroupPoints(module: ModuleId): number {
  return GROUPS.filter((g) => g.module === module).reduce(
    (sum, g) => sum + groupMaxPoints(g),
    0,
  );
}
