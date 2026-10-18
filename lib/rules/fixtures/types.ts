/**
 * External ground truth: what an assessment actually produced.
 *
 * Everything else in this repository checks the model against itself. Both
 * scoring paths read the same `criteria.ts`, so a misreading of the official
 * instrument — a transposed point value, a criterion filed under the wrong
 * module — passes every existing test twice and looks like agreement.
 *
 * A fixture is the only kind of test that can catch that, because the expected
 * answer comes from outside this codebase. One real case is worth more here
 * than a hundred more unit tests.
 */

import type { ModuleId, Pflegegrad } from '../nba';
import type { ConditionId } from '../../intake/criteria';

export interface GutachtenCase {
  /** Short stable id, e.g. "bri-2023-beispiel-3". */
  id: string;

  /**
   * Where this came from, precisely enough for a reader to find it again:
   * publication, edition or date, and page or section. "A forum post" is not
   * a source; neither is "an example I was told about".
   */
  source: string;

  /** URL of the source, where one exists. */
  url?: string;

  /** ISO date a human last checked this case against that source. */
  checkedOn: string;

  /**
   * Anything about the case a reader needs in order to judge whether a
   * mismatch is our bug or a difference in the case itself.
   */
  note?: string;

  /** Gating answers as the case describes them. */
  conditions: Partial<Record<ConditionId, boolean>>;

  /** Criterion id → level index, exactly as the report records them. */
  levels: Record<string, number>;

  /** Module 5 as bands, where the case gives enough to derive them. */
  m5?: { daily?: number; weekly?: number; intensive?: number };
  dietLevel?: number;

  /**
   * What the assessment arrived at.
   *
   * `modules` is optional but worth recording wherever the report prints the
   * per-module points: when a case fails, the module breakdown says which part
   * of the instrument we have wrong, and a bare grade does not.
   */
  expect: {
    grade: Pflegegrad;
    modules?: Partial<Record<ModuleId, number>>;
    totalWeighted?: number;
  };
}
