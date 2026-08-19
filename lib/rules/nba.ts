/**
 * Pflegegrad determination (Neues Begutachtungsassessment).
 *
 * Six modules are scored in raw points, each raw score is mapped onto a
 * weighted score via a fixed bracket table, and the weighted scores sum to a
 * total out of 100 that determines the Pflegegrad.
 *
 * Modules 2 and 3 share a single 15-point allocation: only the higher of the
 * two weighted scores counts.
 *
 * Source: § 15 SGB XI, conversion tables per AOK Gesundheitspartner.
 * See SOURCES.nbaAssessment.
 *
 * IMPORTANT: this reproduces the official arithmetic exactly, but the raw
 * module scores it consumes are an *estimate* derived from a conversational
 * intake, not a Medizinischer Dienst assessment. Everything downstream must
 * present the result as `Einschätzung`, never as a Pflegegrad.
 */

import type { SourceId } from './sources';

export type Pflegegrad = 0 | 1 | 2 | 3 | 4 | 5;

export type ModuleId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6';

/** Severity band a raw score falls into. Index matches the official 0–4 scale. */
export type Severity = 0 | 1 | 2 | 3 | 4;

export const SEVERITY_LABELS: Record<Severity, { de: string; en: string }> = {
  0: { de: 'keine Beeinträchtigung', en: 'no impairment' },
  1: { de: 'geringe Beeinträchtigung', en: 'mild impairment' },
  2: { de: 'erhebliche Beeinträchtigung', en: 'considerable impairment' },
  3: { de: 'schwere Beeinträchtigung', en: 'severe impairment' },
  4: { de: 'schwerste Beeinträchtigung', en: 'most severe impairment' },
};

interface Bracket {
  /** Inclusive lower bound of the raw score. */
  from: number;
  /** Inclusive upper bound of the raw score. */
  to: number;
  weighted: number;
  severity: Severity;
}

export interface ModuleSpec {
  id: ModuleId;
  name: { de: string; en: string };
  /** Share of the 100-point total this module contributes at maximum. */
  maxWeighted: number;
  /** Highest raw score the module can produce. */
  maxRaw: number;
  brackets: readonly Bracket[];
}

/**
 * The bracket tables are the load-bearing part of this file. They are
 * transcribed from the official conversion tables; the upper bound of the last
 * bracket in each module equals that module's maximum raw score.
 */
export const MODULES: Record<ModuleId, ModuleSpec> = {
  m1: {
    id: 'm1',
    name: { de: 'Mobilität', en: 'Mobility' },
    maxWeighted: 10,
    maxRaw: 15,
    brackets: [
      { from: 0, to: 1, weighted: 0, severity: 0 },
      { from: 2, to: 3, weighted: 2.5, severity: 1 },
      { from: 4, to: 5, weighted: 5, severity: 2 },
      { from: 6, to: 9, weighted: 7.5, severity: 3 },
      { from: 10, to: 15, weighted: 10, severity: 4 },
    ],
  },
  m2: {
    id: 'm2',
    name: {
      de: 'Kognitive und kommunikative Fähigkeiten',
      en: 'Cognitive and communicative abilities',
    },
    maxWeighted: 15,
    maxRaw: 33,
    brackets: [
      { from: 0, to: 1, weighted: 0, severity: 0 },
      { from: 2, to: 5, weighted: 3.75, severity: 1 },
      { from: 6, to: 10, weighted: 7.5, severity: 2 },
      { from: 11, to: 16, weighted: 11.25, severity: 3 },
      { from: 17, to: 33, weighted: 15, severity: 4 },
    ],
  },
  m3: {
    id: 'm3',
    name: {
      de: 'Verhaltensweisen und psychische Problemlagen',
      en: 'Behaviour and psychological problems',
    },
    maxWeighted: 15,
    maxRaw: 65,
    brackets: [
      { from: 0, to: 0, weighted: 0, severity: 0 },
      { from: 1, to: 2, weighted: 3.75, severity: 1 },
      { from: 3, to: 4, weighted: 7.5, severity: 2 },
      { from: 5, to: 6, weighted: 11.25, severity: 3 },
      { from: 7, to: 65, weighted: 15, severity: 4 },
    ],
  },
  m4: {
    id: 'm4',
    name: { de: 'Selbstversorgung', en: 'Self-care' },
    maxWeighted: 40,
    maxRaw: 54,
    brackets: [
      { from: 0, to: 2, weighted: 0, severity: 0 },
      { from: 3, to: 7, weighted: 10, severity: 1 },
      { from: 8, to: 18, weighted: 20, severity: 2 },
      { from: 19, to: 36, weighted: 30, severity: 3 },
      { from: 37, to: 54, weighted: 40, severity: 4 },
    ],
  },
  m5: {
    id: 'm5',
    name: {
      de: 'Bewältigung von krankheits- und therapiebedingten Anforderungen',
      en: 'Coping with illness- and therapy-related demands',
    },
    maxWeighted: 20,
    maxRaw: 15,
    brackets: [
      { from: 0, to: 0, weighted: 0, severity: 0 },
      { from: 1, to: 1, weighted: 5, severity: 1 },
      { from: 2, to: 3, weighted: 10, severity: 2 },
      { from: 4, to: 5, weighted: 15, severity: 3 },
      { from: 6, to: 15, weighted: 20, severity: 4 },
    ],
  },
  m6: {
    id: 'm6',
    name: {
      de: 'Gestaltung des Alltagslebens und sozialer Kontakte',
      en: 'Structuring daily life and social contacts',
    },
    maxWeighted: 15,
    maxRaw: 18,
    brackets: [
      { from: 0, to: 0, weighted: 0, severity: 0 },
      { from: 1, to: 3, weighted: 3.75, severity: 1 },
      { from: 4, to: 6, weighted: 7.5, severity: 2 },
      { from: 7, to: 11, weighted: 11.25, severity: 3 },
      { from: 12, to: 18, weighted: 15, severity: 4 },
    ],
  },
};

export type RawScores = Record<ModuleId, number>;

/** Lower bound of each Pflegegrad in total weighted points. */
export const GRADE_THRESHOLDS: ReadonlyArray<{ grade: Pflegegrad; from: number }> = [
  { grade: 5, from: 90 },
  { grade: 4, from: 70 },
  { grade: 3, from: 47.5 },
  { grade: 2, from: 27 },
  { grade: 1, from: 12.5 },
  { grade: 0, from: 0 },
];

export interface ModuleResult {
  id: ModuleId;
  name: { de: string; en: string };
  raw: number;
  weighted: number;
  severity: Severity;
  /** False for whichever of m2/m3 lost the comparison. */
  counted: boolean;
}

export interface Assessment {
  grade: Pflegegrad;
  totalWeighted: number;
  modules: ModuleResult[];
  /** Weighted points still needed to reach the next grade; null at grade 5. */
  pointsToNextGrade: number | null;
  nextGrade: Pflegegrad | null;
  source: SourceId;
}

function clampRaw(spec: ModuleSpec, raw: number): number {
  if (!Number.isFinite(raw)) {
    throw new Error(`Module ${spec.id}: raw score must be a finite number, got ${raw}`);
  }
  if (raw < 0) {
    throw new Error(`Module ${spec.id}: raw score must not be negative, got ${raw}`);
  }
  // Raw scores above the module maximum land in the top bracket either way;
  // clamping keeps the reported raw value honest rather than silently inflated.
  return Math.min(Math.round(raw), spec.maxRaw);
}

function bracketFor(spec: ModuleSpec, raw: number): Bracket {
  const hit = spec.brackets.find((b) => raw >= b.from && raw <= b.to);
  if (!hit) {
    // Unreachable while the tables stay contiguous from 0 to maxRaw; guards
    // against a future edit that leaves a gap.
    throw new Error(`Module ${spec.id}: no bracket covers raw score ${raw}`);
  }
  return hit;
}

export function gradeForPoints(totalWeighted: number): Pflegegrad {
  const hit = GRADE_THRESHOLDS.find((t) => totalWeighted >= t.from);
  return hit ? hit.grade : 0;
}

/**
 * Run the official arithmetic over a set of raw module scores.
 *
 * Modules 2 and 3 compete for one 15-point slot: the higher weighted score
 * counts and the other is carried through marked `counted: false`, so the UI
 * can show why it did not contribute.
 */
export function assess(raw: RawScores): Assessment {
  const results: ModuleResult[] = (Object.keys(MODULES) as ModuleId[]).map((id) => {
    const spec = MODULES[id];
    const r = clampRaw(spec, raw[id]);
    const b = bracketFor(spec, r);
    return {
      id,
      name: spec.name,
      raw: r,
      weighted: b.weighted,
      severity: b.severity,
      counted: true,
    };
  });

  const byId = (id: ModuleId) => results.find((m) => m.id === id)!;
  const m2 = byId('m2');
  const m3 = byId('m3');

  // Ties resolve to m2, matching the convention of reporting the cognitive
  // module when both reach the same weighted score.
  const loser = m3.weighted > m2.weighted ? m2 : m3;
  loser.counted = false;

  const totalWeighted = results
    .filter((m) => m.counted)
    .reduce((sum, m) => sum + m.weighted, 0);

  const grade = gradeForPoints(totalWeighted);
  const next = GRADE_THRESHOLDS.filter((t) => t.from > totalWeighted).sort(
    (a, b) => a.from - b.from,
  )[0];

  return {
    grade,
    totalWeighted,
    modules: results,
    pointsToNextGrade: next ? round2(next.from - totalWeighted) : null,
    nextGrade: next ? next.grade : null,
    source: 'nbaAssessment',
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
