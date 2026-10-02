/**
 * What to do before the Medizinischer Dienst visits.
 *
 * The estimate is only worth something if the assessment hears the same
 * things, and what decides that is preparation on the family's side: a diary,
 * the documents to hand, someone present who will describe a bad day. Shown
 * whenever the first step leads to an assessment.
 */

import type { UiKey } from '../i18n/strings';
import type { GapReport } from '../rules';

export const PREP_TIPS: readonly UiKey[] = [
  'prep1',
  'prep2',
  'prep3',
  'prep4',
  'prep5',
  'prep6',
  'prep7',
];

/** Does any step lead to a visit by the Medizinischer Dienst? */
export function assessmentAhead(report: GapReport): boolean {
  return report.actions.some(
    (a) => a.kind === 'apply-grade' || a.kind === 'appeal-grade' || a.kind === 'request-upgrade',
  );
}
