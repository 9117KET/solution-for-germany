/**
 * Joins the official wording to its everyday rewording.
 *
 * The interface never reaches into either registry directly. It asks here, gets
 * a `Readable` back, and renders both wordings, everyday phrasing first when
 * plain words are on, official phrasing underneath. That keeps the decision
 * about which words to lead with in one place instead of at every call site.
 */

import type { Readable } from '../i18n';
import {
  SCALE_LABELS,
  TUBE_FEEDING_LABELS,
  CONDITIONS,
  type ConditionId,
  type Criterion,
  type ScaleVariant,
} from './criteria';
import { PLAIN_CONDITIONS, PLAIN_CRITERIA, PLAIN_M5, PLAIN_SCALE } from './plain';
import type { M5Criterion } from './score';

export function criterionLabel(c: Criterion): Readable {
  return { ...c.label, easy: PLAIN_CRITERIA[c.id] };
}

export function conditionLabel(id: ConditionId): Readable {
  return { ...CONDITIONS[id], easy: PLAIN_CONDITIONS[id] };
}

export function m5Label(c: M5Criterion): Readable {
  return { ...c.label, easy: PLAIN_M5[c.id] };
}

/** The official option wording for a scale, whichever registry holds it. */
export function officialScale(variant: ScaleVariant) {
  return variant === 'tubeFeeding' ? TUBE_FEEDING_LABELS : SCALE_LABELS[variant];
}

/** The answer options for a scale, official wording paired with everyday wording. */
export function scaleOptions(variant: ScaleVariant): Readable[] {
  const plain = PLAIN_SCALE[variant];
  return officialScale(variant).map((l, i) => ({ ...l, easy: plain[i] }));
}

/**
 * The options for one criterion. Only the tube-feeding criterion has its own
 * scale; everything else shares one of the three standard scales.
 */
export function criterionOptions(c: Criterion): Readable[] {
  return scaleOptions(c.scale);
}
