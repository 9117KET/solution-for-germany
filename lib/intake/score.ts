/**
 * Intake answers → raw module scores.
 *
 * Modules 1, 2, 3, 4 and 6 score per criterion and sum. Module 5 does not: it
 * pools frequencies across groups of criteria, converts each group total to an
 * average, and scores the group as a whole. That difference is why module 5
 * lives here in its own model rather than in the criteria registry.
 *
 * Unanswered criteria score zero. Zero means "fully independent", so a partial
 * intake always under-states the grade rather than over-stating it. Every
 * default in this file leans the same way: if we are going to be wrong, we are
 * wrong in the direction that does not send a family to the Pflegekasse with a
 * number that falls apart.
 */

import type { ModuleId, RawScores } from '../rules/nba';
import { CRITERIA, type ConditionId, type Criterion } from './criteria';

// ---------------------------------------------------------------- Module 5

export type M5Group = 'daily' | 'weekly' | 'intensive' | 'diet';

export interface M5Criterion {
  id: string;
  group: M5Group;
  label: { de: string; en: string };
  /** Points per monthly occurrence. Only meaningful for the `intensive` group. */
  monthlyFactor?: 1 | 2;
  /**
   * Row only applies when at least one of these conditions holds. Any of them
   * is enough: bowel management is relevant to incontinence on its own, without
   * a stoma. Ungated rows are asked of every household.
   */
  dependsOnAny?: readonly ConditionId[];
}

export const M5_CRITERIA: readonly M5Criterion[] = [
  { id: '5.1', group: 'daily', label: { de: 'Medikation', en: 'Medication' } },
  { id: '5.2', group: 'daily', label: { de: 'Injektionen', en: 'Injections' } },
  { id: '5.3', group: 'daily', label: { de: 'Versorgung intravenöser Zugänge', en: 'Intravenous access care' } },
  { id: '5.4', group: 'daily', label: { de: 'Absaugen und Sauerstoffgabe', en: 'Suctioning and oxygen' } },
  { id: '5.5', group: 'daily', label: { de: 'Einreibungen, Kälte- und Wärmeanwendungen', en: 'Rubs, cold and heat applications' } },
  { id: '5.6', group: 'daily', label: { de: 'Messung und Deutung von Körperzuständen', en: 'Measuring and interpreting body readings' } },
  { id: '5.7', group: 'daily', label: { de: 'Körpernahe Hilfsmittel', en: 'Body-worn assistive devices' } },

  { id: '5.8', group: 'weekly', label: { de: 'Verbandswechsel und Wundversorgung', en: 'Dressing changes and wound care' } },
  { id: '5.9', group: 'weekly', label: { de: 'Versorgung mit Stoma', en: 'Stoma care' }, dependsOnAny: ['hasStomaOrCatheter'] },
  { id: '5.10', group: 'weekly', label: { de: 'Regelmäßige Einmalkatheterisierung und Nutzung von Abführmethoden', en: 'Regular catheterisation and bowel management' }, dependsOnAny: ['hasStomaOrCatheter', 'hasIncontinence'] },
  { id: '5.11', group: 'weekly', label: { de: 'Therapiemaßnahmen in häuslicher Umgebung', en: 'Therapy carried out at home' } },

  { id: '5.12', group: 'intensive', monthlyFactor: 2, label: { de: 'Zeit- und technikintensive Maßnahmen in häuslicher Umgebung', en: 'Time- and equipment-intensive procedures at home' } },
  { id: '5.13', group: 'intensive', monthlyFactor: 1, label: { de: 'Arztbesuche', en: 'Doctor visits' } },
  { id: '5.14', group: 'intensive', monthlyFactor: 1, label: { de: 'Besuch anderer medizinischer oder therapeutischer Einrichtungen (bis 3 Stunden)', en: 'Visits to medical or therapeutic facilities (up to 3 hours)' } },
  { id: '5.15', group: 'intensive', monthlyFactor: 2, label: { de: 'Zeitlich ausgedehnte Besuche medizinischer Einrichtungen (über 3 Stunden)', en: 'Extended visits to medical facilities (over 3 hours)' } },

  { id: '5.16', group: 'diet', label: { de: 'Einhaltung einer Diät oder anderer krankheitsbedingter Verhaltensvorschriften', en: 'Following a diet or other illness-related rules' } },
];

export type Per = 'day' | 'week' | 'month';

export interface Frequency {
  count: number;
  per: Per;
}

const PER_DAY: Record<Per, number> = { day: 1, week: 1 / 7, month: 1 / 30 };
/** A week is 4.3 months' worth of occurrences, per the official conversion. */
const PER_MONTH: Record<Per, number> = { day: 30, week: 4.3, month: 1 };

const perDay = (f: Frequency): number => f.count * PER_DAY[f.per];
const perMonth = (f: Frequency): number => f.count * PER_MONTH[f.per];

/** Group A (5.1–5.7): pooled occurrences per day. */
export function scoreM5Daily(total: number): number {
  if (total < 1) return 0;
  if (total <= 3) return 1;
  if (total <= 8) return 2;
  return 3;
}

/** Group B (5.8–5.11): pooled occurrences, scored across week and day. */
export function scoreM5Weekly(perDayTotal: number): number {
  if (perDayTotal < 1 / 7) return 0;
  if (perDayTotal < 1) return 1;
  if (perDayTotal < 3) return 2;
  return 3;
}

/** Group C (5.12–5.15): weighted monthly point accumulation. */
export function scoreM5Intensive(points: number): number {
  if (points < 4.3) return 0;
  if (points < 8.6) return 1;
  if (points < 12.9) return 2;
  if (points < 60) return 3;
  return 6; // continuous invasive support, e.g. mechanical ventilation
}

// ------------------------------------------------------------ Intake shape

export interface IntakeAnswers {
  /** Gating answers, established once up front. */
  conditions: Partial<Record<ConditionId, boolean>>;
  /**
   * Criterion id → chosen level index (0–3, or 0–2 for criterion 4.13).
   * Absent means unanswered, which scores zero.
   */
  levels: Record<string, number>;
  /** Module 5 criterion id → how often the measure happens. */
  frequencies: Partial<Record<string, Frequency>>;
  /** Level index 0–3 for criterion 5.16. */
  dietLevel?: number;
}

export const emptyIntake = (): IntakeAnswers => ({
  conditions: {},
  levels: {},
  frequencies: {},
});

/** Is this criterion in scope, given the gating answers? */
export function isApplicable(c: Criterion, conditions: IntakeAnswers['conditions']): boolean {
  if (!c.dependsOn) return true;
  return conditions[c.dependsOn] === true;
}

/**
 * Is this module 5 row in scope, given the gating answers?
 *
 * Applied when scoring, not only when rendering, so a frequency left behind by
 * a household that changed a gating answer cannot go on contributing points.
 */
export function isM5Applicable(
  c: M5Criterion,
  conditions: IntakeAnswers['conditions'],
): boolean {
  if (!c.dependsOnAny) return true;
  return c.dependsOnAny.some((id) => conditions[id] === true);
}

function levelPoints(c: Criterion, level: number | undefined): number {
  if (level === undefined) return 0;
  const idx = Math.max(0, Math.min(c.points.length - 1, Math.round(level)));
  return c.points[idx];
}

export interface ModuleCoverage {
  module: ModuleId;
  /** Criteria in scope for this household. */
  applicable: number;
  /** Of those, how many were actually answered. */
  answered: number;
}

export interface ScoredIntake {
  raw: RawScores;
  coverage: ModuleCoverage[];
  /** Share of applicable criteria answered, across all modules. */
  completeness: number;
}

export function scoreIntake(answers: IntakeAnswers): ScoredIntake {
  const raw: RawScores = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };
  const coverage = new Map<ModuleId, ModuleCoverage>();

  const bump = (m: ModuleId, applicable: number, answered: number) => {
    const c = coverage.get(m) ?? { module: m, applicable: 0, answered: 0 };
    c.applicable += applicable;
    c.answered += answered;
    coverage.set(m, c);
  };

  for (const c of CRITERIA) {
    if (!isApplicable(c, answers.conditions)) {
      bump(c.module, 0, 0);
      continue;
    }
    const level = answers.levels[c.id];
    raw[c.module] += levelPoints(c, level);
    bump(c.module, 1, level === undefined ? 0 : 1);
  }

  raw.m5 = scoreModule5(answers);
  const m5Applicable = answers.conditions.hasMedicalMeasures === true ? 1 : 0;
  const m5Answered =
    Object.values(answers.frequencies).some((f) => f !== undefined) ||
    answers.dietLevel !== undefined
      ? 1
      : 0;
  bump('m5', m5Applicable, Math.min(m5Applicable, m5Answered));

  const totals = [...coverage.values()];
  const applicable = totals.reduce((s, c) => s + c.applicable, 0);
  const answered = totals.reduce((s, c) => s + c.answered, 0);

  return {
    raw,
    coverage: totals.sort((a, b) => a.module.localeCompare(b.module)),
    completeness: applicable === 0 ? 0 : answered / applicable,
  };
}

export function scoreModule5(answers: IntakeAnswers): number {
  const freq = answers.frequencies;
  const of = (group: M5Group) =>
    M5_CRITERIA.filter((c) => c.group === group && isM5Applicable(c, answers.conditions));

  const dailyTotal = of('daily').reduce((sum, c) => {
    const f = freq[c.id];
    return sum + (f ? perDay(f) : 0);
  }, 0);

  const weeklyTotal = of('weekly').reduce((sum, c) => {
    const f = freq[c.id];
    return sum + (f ? perDay(f) : 0);
  }, 0);

  const intensivePoints = of('intensive').reduce((sum, c) => {
    const f = freq[c.id];
    if (!f) return sum;
    return sum + perMonth(f) * (c.monthlyFactor ?? 1);
  }, 0);

  const diet = answers.dietLevel === undefined ? 0 : Math.max(0, Math.min(3, Math.round(answers.dietLevel)));

  const total =
    scoreM5Daily(dailyTotal) +
    scoreM5Weekly(weeklyTotal) +
    scoreM5Intensive(intensivePoints) +
    diet;

  // The conversion table for module 5 tops out at 15; scoring above that is
  // impossible under the official rules, but clamping keeps a future edit to
  // the group functions from producing an out-of-range raw score.
  return Math.min(15, total);
}

/** Criteria the intake should still ask about, in order. */
export function remainingCriteria(answers: IntakeAnswers): Criterion[] {
  return CRITERIA.filter(
    (c) => isApplicable(c, answers.conditions) && answers.levels[c.id] === undefined,
  );
}
