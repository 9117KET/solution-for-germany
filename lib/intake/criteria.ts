/**
 * The official assessment criteria, as the intake asks about them.
 *
 * Modules 1, 2, 4 and 6 score each criterion on a four-level scale. Most
 * criteria span 0–3, but four of them carry extra weight and span wider ranges;
 * the four levels are spread evenly across whatever range the criterion has.
 *
 * Module 3 scores by how often a behaviour occurs, on a 0/1/3/5 scale.
 *
 * Module 5 does not score per criterion at all: it aggregates frequencies
 * across groups of criteria and converts the group total. It is modelled
 * separately in `score.ts`.
 *
 * Criterion counts and point ranges are transcribed from the official
 * instrument; `intake.test.ts` asserts that each module's criteria sum to
 * exactly the maximum raw score the conversion tables expect.
 */

import type { ModuleId } from '../rules/nba';

/** Which four-level wording the UI should present for a criterion. */
export type ScaleVariant =
  /** selbständig … unselbständig, used by modules 1, 4, 6 */
  | 'independence'
  /** vorhanden … nicht vorhanden, used by module 2 */
  | 'ability'
  /** nie … täglich, used by module 3 */
  | 'frequency'
  /** the special three-outcome scale of criterion 4.13 */
  | 'tubeFeeding';

export interface Criterion {
  /** Official numbering, e.g. "4.8". */
  id: string;
  module: ModuleId;
  label: { de: string; en: string };
  /** A concrete cue, in the words a family would recognise. */
  hint?: { de: string; en: string };
  scale: ScaleVariant;
  /**
   * Points awarded at each of the four levels, in order. Length is always 4
   * except for `tubeFeeding`, which has three outcomes.
   */
  points: readonly number[];
  /**
   * Criterion only applies when this condition holds. Lets the intake skip
   * whole blocks: most households answer "no" to stoma, catheter and tube
   * feeding, and should never be asked the follow-ups.
   */
  dependsOn?: ConditionId;
}

/** Gating conditions the intake establishes once, up front. */
export type ConditionId =
  | 'hasIncontinence'
  | 'hasStomaOrCatheter'
  | 'hasTubeFeeding'
  | 'hasMedicalMeasures';

export const CONDITIONS: Record<ConditionId, { de: string; en: string }> = {
  hasIncontinence: {
    de: 'Gibt es Probleme mit dem Wasserlassen oder dem Stuhlgang?',
    en: 'Are there problems with bladder or bowel control?',
  },
  hasStomaOrCatheter: {
    de: 'Gibt es einen Dauerkatheter, ein Urostoma oder ein Stoma?',
    en: 'Is there a permanent catheter, urostomy or stoma?',
  },
  hasTubeFeeding: {
    de: 'Wird über eine Sonde oder über die Vene ernährt?',
    en: 'Is feeding done through a tube or intravenously?',
  },
  hasMedicalMeasures: {
    de: 'Sind regelmäßig ärztlich verordnete Maßnahmen nötig: Medikamente, Verbände, Spritzen, Therapien?',
    en: 'Are prescribed medical measures needed regularly: medication, dressings, injections, therapies?',
  },
};

/** Four evenly spaced levels across a 0..max range. */
const spread = (max: number): readonly number[] => [0, max / 3, (max * 2) / 3, max];

const IND = [0, 1, 2, 3] as const;
const FREQ = [0, 1, 3, 5] as const;

export const CRITERIA: readonly Criterion[] = [
  // ---------------------------------------------------------------- Modul 1
  {
    id: '1.1',
    module: 'm1',
    label: { de: 'Positionswechsel im Bett', en: 'Changing position in bed' },
    hint: {
      de: 'Sich im Liegen drehen, aufrichten, im Bett bewegen.',
      en: 'Turning over, sitting up, moving around in bed.',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '1.2',
    module: 'm1',
    label: { de: 'Halten einer stabilen Sitzposition', en: 'Holding a stable sitting position' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '1.3',
    module: 'm1',
    label: { de: 'Umsetzen', en: 'Transferring' },
    hint: {
      de: 'Vom Bett auf einen Stuhl oder Rollstuhl wechseln.',
      en: 'Moving from bed to a chair or wheelchair.',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '1.4',
    module: 'm1',
    label: {
      de: 'Fortbewegen innerhalb des Wohnbereichs',
      en: 'Moving around inside the home',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '1.5',
    module: 'm1',
    label: { de: 'Treppensteigen', en: 'Climbing stairs' },
    scale: 'independence',
    points: IND,
  },

  // ---------------------------------------------------------------- Modul 2
  {
    id: '2.1',
    module: 'm2',
    label: {
      de: 'Erkennen von Personen aus dem näheren Umfeld',
      en: 'Recognising people from close surroundings',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.2',
    module: 'm2',
    label: { de: 'Örtliche Orientierung', en: 'Orientation to place' },
    hint: {
      de: 'Weiß die Person, wo sie sich befindet?',
      en: 'Does the person know where they are?',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.3',
    module: 'm2',
    label: { de: 'Zeitliche Orientierung', en: 'Orientation to time' },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.4',
    module: 'm2',
    label: {
      de: 'Erinnern an wesentliche Ereignisse oder Beobachtungen',
      en: 'Remembering significant events or observations',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.5',
    module: 'm2',
    label: {
      de: 'Steuern von mehrschrittigen Alltagshandlungen',
      en: 'Carrying out everyday tasks with several steps',
    },
    hint: {
      de: 'Zum Beispiel Kaffee kochen: Wasser, Filter, Pulver, Einschalten.',
      en: 'Making coffee, say: water, filter, grounds, switch on.',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.6',
    module: 'm2',
    label: {
      de: 'Treffen von Entscheidungen im Alltagsleben',
      en: 'Making everyday decisions',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.7',
    module: 'm2',
    label: {
      de: 'Verstehen von Sachverhalten und Informationen',
      en: 'Understanding facts and information',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.8',
    module: 'm2',
    label: { de: 'Erkennen von Risiken und Gefahren', en: 'Recognising risks and dangers' },
    hint: {
      de: 'Zum Beispiel eine heiße Herdplatte oder eine offene Wohnungstür.',
      en: 'A hot stove, say, or a front door left open.',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.9',
    module: 'm2',
    label: {
      de: 'Mitteilen von elementaren Bedürfnissen',
      en: 'Communicating basic needs',
    },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.10',
    module: 'm2',
    label: { de: 'Verstehen von Aufforderungen', en: 'Understanding requests' },
    scale: 'ability',
    points: IND,
  },
  {
    id: '2.11',
    module: 'm2',
    label: { de: 'Beteiligen an einem Gespräch', en: 'Taking part in a conversation' },
    scale: 'ability',
    points: IND,
  },

  // ---------------------------------------------------------------- Modul 3
  {
    id: '3.1',
    module: 'm3',
    label: {
      de: 'Motorisch geprägte Verhaltensauffälligkeiten',
      en: 'Restless or repetitive movement',
    },
    hint: {
      de: 'Umherlaufen, ruheloses Hin- und Hergehen, Weglauftendenz.',
      en: 'Pacing, wandering, tendency to leave.',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.2',
    module: 'm3',
    label: { de: 'Nächtliche Unruhe', en: 'Restlessness at night' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.3',
    module: 'm3',
    label: {
      de: 'Selbstschädigendes und autoaggressives Verhalten',
      en: 'Self-harming behaviour',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.4',
    module: 'm3',
    label: { de: 'Beschädigen von Gegenständen', en: 'Damaging objects' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.5',
    module: 'm3',
    label: {
      de: 'Physisch aggressives Verhalten gegenüber anderen Personen',
      en: 'Physically aggressive behaviour towards others',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.6',
    module: 'm3',
    label: { de: 'Verbale Aggression', en: 'Verbal aggression' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.7',
    module: 'm3',
    label: {
      de: 'Andere pflegerelevante vokale Auffälligkeiten',
      en: 'Other vocal disturbances',
    },
    hint: {
      de: 'Lautes Rufen, Schreien, ständiges Wiederholen.',
      en: 'Calling out, shouting, constant repetition.',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.8',
    module: 'm3',
    label: {
      de: 'Abwehr pflegerischer und anderer unterstützender Maßnahmen',
      en: 'Resisting care and support',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.9',
    module: 'm3',
    label: { de: 'Wahnvorstellungen', en: 'Delusions' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.10',
    module: 'm3',
    label: { de: 'Ängste', en: 'Anxiety' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.11',
    module: 'm3',
    label: {
      de: 'Antriebslosigkeit bei depressiver Stimmungslage',
      en: 'Listlessness with low mood',
    },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.12',
    module: 'm3',
    label: { de: 'Sozial inadäquate Verhaltensweisen', en: 'Socially inappropriate behaviour' },
    scale: 'frequency',
    points: FREQ,
  },
  {
    id: '3.13',
    module: 'm3',
    label: {
      de: 'Sonstige pflegerelevante inadäquate Handlungen',
      en: 'Other care-relevant inappropriate actions',
    },
    scale: 'frequency',
    points: FREQ,
  },

  // ---------------------------------------------------------------- Modul 4
  {
    id: '4.1',
    module: 'm4',
    label: { de: 'Waschen des vorderen Oberkörpers', en: 'Washing the upper body' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.2',
    module: 'm4',
    label: { de: 'Körperpflege im Bereich des Kopfes', en: 'Grooming the head' },
    hint: {
      de: 'Kämmen, Zähne putzen, Rasieren.',
      en: 'Combing, brushing teeth, shaving.',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.3',
    module: 'm4',
    label: { de: 'Waschen des Intimbereichs', en: 'Washing the intimate area' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.4',
    module: 'm4',
    label: {
      de: 'Duschen oder Baden einschließlich Waschen der Haare',
      en: 'Showering or bathing, including washing hair',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.5',
    module: 'm4',
    label: { de: 'An- und Auskleiden des Oberkörpers', en: 'Dressing the upper body' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.6',
    module: 'm4',
    label: { de: 'An- und Auskleiden des Unterkörpers', en: 'Dressing the lower body' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '4.7',
    module: 'm4',
    label: {
      de: 'Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken',
      en: 'Preparing food into bite-sized pieces and pouring drinks',
    },
    scale: 'independence',
    points: IND,
  },
  {
    // Carries the heaviest single weight in the whole instrument.
    id: '4.8',
    module: 'm4',
    label: { de: 'Essen', en: 'Eating' },
    hint: {
      de: 'Die Nahrung selbst zum Mund führen und essen.',
      en: 'Bringing food to the mouth and eating it.',
    },
    scale: 'independence',
    points: spread(9),
  },
  {
    id: '4.9',
    module: 'm4',
    label: { de: 'Trinken', en: 'Drinking' },
    scale: 'independence',
    points: spread(6),
  },
  {
    id: '4.10',
    module: 'm4',
    label: {
      de: 'Benutzen einer Toilette oder eines Toilettenstuhls',
      en: 'Using a toilet or commode',
    },
    scale: 'independence',
    points: spread(6),
  },
  {
    id: '4.11',
    module: 'm4',
    label: {
      de: 'Bewältigen der Folgen einer Harninkontinenz',
      en: 'Managing the effects of urinary incontinence',
    },
    scale: 'independence',
    points: IND,
    dependsOn: 'hasIncontinence',
  },
  {
    id: '4.12',
    module: 'm4',
    label: {
      de: 'Bewältigen der Folgen einer Stuhlinkontinenz',
      en: 'Managing the effects of bowel incontinence',
    },
    scale: 'independence',
    points: IND,
    dependsOn: 'hasIncontinence',
  },
  {
    // Three outcomes, not four: no daily tube feeding (0), tube feeding
    // alongside oral intake (6), or feeding almost entirely by tube (3).
    id: '4.13',
    module: 'm4',
    label: {
      de: 'Ernährung parenteral oder über Sonde',
      en: 'Feeding by tube or intravenously',
    },
    scale: 'tubeFeeding',
    points: [0, 6, 3],
    dependsOn: 'hasTubeFeeding',
  },

  // ---------------------------------------------------------------- Modul 6
  {
    id: '6.1',
    module: 'm6',
    label: {
      de: 'Gestaltung des Tagesablaufs und Anpassung an Veränderungen',
      en: 'Structuring the day and adapting to change',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '6.2',
    module: 'm6',
    label: { de: 'Ruhen und Schlafen', en: 'Resting and sleeping' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '6.3',
    module: 'm6',
    label: { de: 'Sichbeschäftigen', en: 'Occupying oneself' },
    scale: 'independence',
    points: IND,
  },
  {
    id: '6.4',
    module: 'm6',
    label: {
      de: 'Vornehmen von in die Zukunft gerichteten Planungen',
      en: 'Making plans for the future',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '6.5',
    module: 'm6',
    label: {
      de: 'Interaktion mit Personen im direkten Kontakt',
      en: 'Interacting with people face to face',
    },
    scale: 'independence',
    points: IND,
  },
  {
    id: '6.6',
    module: 'm6',
    label: {
      de: 'Kontaktpflege zu Personen außerhalb des direkten Umfelds',
      en: 'Keeping in touch with people outside the immediate circle',
    },
    scale: 'independence',
    points: IND,
  },
] as const;

/** Four-level wording per scale variant, in the order the points array uses. */
export const SCALE_LABELS: Record<
  Exclude<ScaleVariant, 'tubeFeeding'>,
  ReadonlyArray<{ de: string; en: string }>
> = {
  independence: [
    { de: 'selbständig', en: 'independently' },
    { de: 'überwiegend selbständig', en: 'mostly independently' },
    { de: 'überwiegend unselbständig', en: 'mostly needs help' },
    { de: 'unselbständig', en: 'cannot do this alone' },
  ],
  ability: [
    { de: 'vorhanden', en: 'no difficulty' },
    { de: 'größtenteils vorhanden', en: 'slight difficulty' },
    { de: 'in geringem Maße vorhanden', en: 'considerable difficulty' },
    { de: 'nicht vorhanden', en: 'not able to' },
  ],
  frequency: [
    { de: 'nie oder sehr selten', en: 'never or very rarely' },
    { de: 'ein- bis dreimal pro Woche', en: 'one to three times a week' },
    { de: 'mehrmals pro Woche', en: 'several times a week' },
    { de: 'täglich', en: 'daily' },
  ],
};

export const TUBE_FEEDING_LABELS: ReadonlyArray<{ de: string; en: string }> = [
  { de: 'nicht täglich oder gar nicht', en: 'not daily, or not at all' },
  { de: 'täglich, zusätzlich zum Essen über den Mund', en: 'daily, alongside eating by mouth' },
  { de: 'ausschließlich oder fast ausschließlich über die Sonde', en: 'entirely or almost entirely by tube' },
];

export function criteriaFor(module: ModuleId): Criterion[] {
  return CRITERIA.filter((c) => c.module === module);
}

export function criterion(id: string): Criterion {
  const c = CRITERIA.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown criterion: ${id}`);
  return c;
}
