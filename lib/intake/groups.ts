/**
 * The instrument, asked in the fewest questions that still decide the grade.
 *
 * The official assessment has 48 scored criteria plus 16 module 5 rows. Asked
 * one at a time that is around seventy screens, and the people this is built
 * for, the very old, the very tired, a family doing this in a second language
 * do not finish seventy screens. An intake nobody finishes estimates nothing.
 *
 * Three separate reductions get that down to roughly twenty, and none of them
 * is a guess:
 *
 *  1. **Module gates.** Modules 2 and 3 are 24 criteria competing for a single
 *     15-point slot. One screening question each ("any problems with memory?",
 *     "any difficult behaviour?") scores the module at zero on a no, which is
 *     exactly what answering all of its criteria at the unimpaired level would
 *     have produced. Handled in `criteria.ts` via `dependsOn`.
 *
 *  2. **Pooled module 5.** Module 5 converts group totals to bands and throws
 *     the precision away. Asking the band directly is four questions instead of
 *     sixteen for the same number. Handled in `score.ts`.
 *
 *  3. **Criterion groups, defined here.** Criteria that describe one activity
 *     from several angles are asked as one question and answered together.
 *     "Washing the upper body", "grooming the head", "washing the intimate
 *     area" and "showering or bathing" become "washing and personal care".
 *
 * The third one is the only reduction that can cost accuracy, because a
 * household really might shower with help and brush its teeth alone. So every
 * group can be opened up and its criteria answered one by one, the group answer
 * is never more than a starting point, and a group counts as answered only when
 * all of its members are.
 *
 * On top of all three sits `adaptive.ts`, which stops asking as soon as the
 * remaining questions cannot change the grade.
 */

import type { Readable } from '../i18n';
import type { ModuleId } from '../rules/nba';
import { CRITERIA, type ConditionId, type Criterion, type ScaleVariant } from './criteria';

export interface CriterionGroup {
  id: string;
  module: ModuleId;
  /** Official criterion ids this question answers, in instrument order. */
  members: readonly string[];
  /** The one question standing in for those criteria. */
  label: Readable;
  /** Shared by every member; a group never mixes answer scales. */
  scale: ScaleVariant;
  /** Inherited from the members; a group is asked only when they apply. */
  dependsOn?: ConditionId;
}

/**
 * Where a group covers several criteria the label has to name all of them, or
 * a family answers about the one it happened to picture. The official register
 * lists the activities; the plain register does the same in everyday words.
 */
export const GROUPS: readonly CriterionGroup[] = [
  // ---------------------------------------------------------------- Modul 1
  {
    id: 'g1.bed',
    module: 'm1',
    members: ['1.1', '1.2'],
    scale: 'independence',
    label: {
      de: 'Positionswechsel im Bett und Halten einer stabilen Sitzposition',
      en: 'Changing position in bed, and holding a stable sitting position',
      easy: {
        de: 'Sich im Bett umdrehen und aufrecht sitzen bleiben',
        en: 'Turning over in bed, and staying sitting upright',
      },
    },
  },
  {
    id: 'g1.move',
    module: 'm1',
    members: ['1.3', '1.4'],
    scale: 'independence',
    label: {
      de: 'Umsetzen und Fortbewegen innerhalb des Wohnbereichs',
      en: 'Transferring, and moving around inside the home',
      easy: {
        de: 'Vom Bett auf einen Stuhl wechseln und in der Wohnung umhergehen',
        en: 'Moving from the bed to a chair, and getting around inside the home',
      },
    },
  },
  {
    id: 'g1.stairs',
    module: 'm1',
    members: ['1.5'],
    scale: 'independence',
    label: {
      de: 'Treppensteigen',
      en: 'Climbing stairs',
      easy: { de: 'Treppen steigen', en: 'Going up and down stairs' },
    },
  },

  // ---------------------------------------------------------------- Modul 2
  {
    id: 'g2.memory',
    module: 'm2',
    members: ['2.1', '2.2', '2.3', '2.4'],
    scale: 'ability',
    dependsOn: 'hasCognitiveIssues',
    label: {
      de: 'Erkennen von Personen, örtliche und zeitliche Orientierung, Erinnern',
      en: 'Recognising people, orientation to place and time, remembering',
      easy: {
        de: 'Bekannte Menschen erkennen, wissen wo und welcher Tag es ist, sich an Wichtiges erinnern',
        en: 'Recognising people they know, knowing where they are and what day it is, remembering important things',
      },
    },
  },
  {
    id: 'g2.thinking',
    module: 'm2',
    members: ['2.5', '2.6', '2.7', '2.8'],
    scale: 'ability',
    dependsOn: 'hasCognitiveIssues',
    label: {
      de: 'Mehrschrittige Handlungen steuern, entscheiden, Sachverhalte verstehen, Risiken erkennen',
      en: 'Carrying out tasks with several steps, deciding, understanding facts, recognising risks',
      easy: {
        de: 'Kaffee kochen, sich entscheiden, Erklärungen verstehen, Gefahren wie eine heiße Herdplatte erkennen',
        en: 'Making coffee, making decisions, understanding explanations, spotting danger such as a hot stove',
      },
    },
  },
  {
    id: 'g2.talk',
    module: 'm2',
    members: ['2.9', '2.10', '2.11'],
    scale: 'ability',
    dependsOn: 'hasCognitiveIssues',
    label: {
      de: 'Elementare Bedürfnisse mitteilen, Aufforderungen verstehen, sich an einem Gespräch beteiligen',
      en: 'Communicating basic needs, understanding requests, taking part in a conversation',
      easy: {
        de: 'Sagen was sie braucht, verstehen wenn man sie um etwas bittet, bei einem Gespräch mitmachen',
        en: 'Saying what they need, understanding when asked to do something, joining in a conversation',
      },
    },
  },

  // ---------------------------------------------------------------- Modul 3
  {
    id: 'g3.restless',
    module: 'm3',
    members: ['3.1', '3.2'],
    scale: 'frequency',
    dependsOn: 'hasBehaviourIssues',
    label: {
      de: 'Motorische Unruhe am Tag und nächtliche Unruhe',
      en: 'Restless movement by day, and restlessness at night',
      easy: {
        de: 'Unruhig umherlaufen, und nachts unruhig sein',
        en: 'Restless pacing or wandering, and being restless at night',
      },
    },
  },
  {
    id: 'g3.aggression',
    module: 'm3',
    members: ['3.3', '3.4', '3.5', '3.6'],
    scale: 'frequency',
    dependsOn: 'hasBehaviourIssues',
    label: {
      de: 'Selbstschädigendes Verhalten, Beschädigen von Gegenständen, körperliche und verbale Aggression',
      en: 'Self-harm, damaging objects, physical and verbal aggression',
      easy: {
        de: 'Sich selbst wehtun, Sachen kaputt machen, andere schlagen oder beschimpfen',
        en: 'Hurting themselves, breaking things, hitting or insulting other people',
      },
    },
  },
  {
    id: 'g3.callingout',
    module: 'm3',
    members: ['3.7', '3.8'],
    scale: 'frequency',
    dependsOn: 'hasBehaviourIssues',
    label: {
      de: 'Vokale Auffälligkeiten und Abwehr pflegerischer Maßnahmen',
      en: 'Vocal disturbances, and resisting care',
      easy: {
        de: 'Laut rufen oder schreien, und sich gegen Hilfe wehren',
        en: 'Calling out or screaming, and fighting off help',
      },
    },
  },
  {
    id: 'g3.mood',
    module: 'm3',
    members: ['3.9', '3.10', '3.11'],
    scale: 'frequency',
    dependsOn: 'hasBehaviourIssues',
    label: {
      de: 'Wahnvorstellungen, Ängste, Antriebslosigkeit bei depressiver Stimmungslage',
      en: 'Delusions, anxiety, listlessness with low mood',
      easy: {
        de: 'Dinge glauben die nicht stimmen, große Angst haben, traurig sein und zu nichts Lust haben',
        en: 'Believing things that are not real, being very frightened, being low and not wanting to do anything',
      },
    },
  },
  {
    id: 'g3.other',
    module: 'm3',
    members: ['3.12', '3.13'],
    scale: 'frequency',
    dependsOn: 'hasBehaviourIssues',
    label: {
      de: 'Sozial inadäquate Verhaltensweisen und sonstige pflegerelevante inadäquate Handlungen',
      en: 'Socially inappropriate behaviour, and other care-relevant inappropriate actions',
      easy: {
        de: 'Sich vor anderen unpassend verhalten, oder andere Dinge tun die Probleme machen',
        en: 'Behaving oddly around other people, or doing other things that cause problems',
      },
    },
  },

  // ---------------------------------------------------------------- Modul 4
  // Self-care carries 40 of the 100 points, so its heaviest criteria are asked
  // on their own rather than pooled. Eating alone is worth 9 raw points, more
  // than washing, grooming and bathing put together.
  {
    id: 'g4.wash',
    module: 'm4',
    members: ['4.1', '4.2', '4.3', '4.4'],
    scale: 'independence',
    label: {
      de: 'Waschen des Oberkörpers und des Intimbereichs, Körperpflege im Bereich des Kopfes, Duschen oder Baden',
      en: 'Washing the upper body and intimate area, grooming the head, showering or bathing',
      easy: {
        de: 'Sich waschen, Haare kämmen, Zähne putzen, duschen oder baden',
        en: 'Washing, combing hair, brushing teeth, showering or bathing',
      },
    },
  },
  {
    id: 'g4.dress',
    module: 'm4',
    members: ['4.5', '4.6'],
    scale: 'independence',
    label: {
      de: 'An- und Auskleiden des Oberkörpers und des Unterkörpers',
      en: 'Dressing and undressing the upper and lower body',
      easy: {
        de: 'Ein Oberteil, eine Hose und Schuhe an- und ausziehen',
        en: 'Putting on and taking off a top, trousers and shoes',
      },
    },
  },
  {
    id: 'g4.prepare',
    module: 'm4',
    members: ['4.7'],
    scale: 'independence',
    label: {
      de: 'Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken',
      en: 'Preparing food into bite-sized pieces and pouring drinks',
      easy: {
        de: 'Essen klein schneiden und Getränke eingießen',
        en: 'Cutting food up and pouring drinks',
      },
    },
  },
  {
    id: 'g4.eat',
    module: 'm4',
    members: ['4.8'],
    scale: 'independence',
    label: {
      de: 'Essen',
      en: 'Eating',
      easy: { de: 'Selbst essen', en: 'Eating without help' },
    },
  },
  {
    id: 'g4.drink',
    module: 'm4',
    members: ['4.9'],
    scale: 'independence',
    label: {
      de: 'Trinken',
      en: 'Drinking',
      easy: { de: 'Selbst trinken', en: 'Drinking without help' },
    },
  },
  {
    id: 'g4.toilet',
    module: 'm4',
    members: ['4.10'],
    scale: 'independence',
    label: {
      de: 'Benutzen einer Toilette oder eines Toilettenstuhls',
      en: 'Using a toilet or commode',
      easy: { de: 'Auf die Toilette gehen', en: 'Getting to and using the toilet' },
    },
  },
  {
    id: 'g4.incontinence',
    module: 'm4',
    members: ['4.11', '4.12'],
    scale: 'independence',
    dependsOn: 'hasIncontinence',
    label: {
      de: 'Bewältigen der Folgen einer Harn- und Stuhlinkontinenz',
      en: 'Managing the effects of urinary and bowel incontinence',
      easy: {
        de: 'Damit umgehen, wenn Urin oder Stuhl abgeht',
        en: 'Coping when urine or stool comes away',
      },
    },
  },
  {
    id: 'g4.tube',
    module: 'm4',
    members: ['4.13'],
    scale: 'tubeFeeding',
    dependsOn: 'hasTubeFeeding',
    label: {
      de: 'Ernährung parenteral oder über Sonde',
      en: 'Feeding by tube or intravenously',
      easy: {
        de: 'Essen über einen Schlauch oder über die Vene',
        en: 'Being fed through a tube or through a vein',
      },
    },
  },

  // ---------------------------------------------------------------- Modul 6
  {
    id: 'g6.day',
    module: 'm6',
    members: ['6.1', '6.2', '6.3'],
    scale: 'independence',
    label: {
      de: 'Gestaltung des Tagesablaufs, Ruhen und Schlafen, Sichbeschäftigen',
      en: 'Structuring the day, resting and sleeping, occupying oneself',
      easy: {
        de: 'Den Tag selbst einteilen, ruhen und schlafen, sich selbst beschäftigen',
        en: 'Planning their own day, resting and sleeping, finding something to do',
      },
    },
  },
  {
    id: 'g6.plan',
    module: 'm6',
    members: ['6.4'],
    scale: 'independence',
    label: {
      de: 'Vornehmen von in die Zukunft gerichteten Planungen',
      en: 'Making plans for the future',
      easy: { de: 'Etwas für später planen', en: 'Planning something for later' },
    },
  },
  {
    id: 'g6.contact',
    module: 'm6',
    members: ['6.5', '6.6'],
    scale: 'independence',
    label: {
      de: 'Interaktion mit Personen im direkten Kontakt und Kontaktpflege nach außen',
      en: 'Interacting with people face to face, and keeping in touch further afield',
      easy: {
        de: 'Mit Menschen reden die da sind, und Kontakt nach außen halten',
        en: 'Getting on with people who are there, and keeping in touch with people further away',
      },
    },
  },
];

const BY_ID = new Map(GROUPS.map((g) => [g.id, g]));
const CRITERION_BY_ID = new Map(CRITERIA.map((c) => [c.id, c]));

export function group(id: string): CriterionGroup {
  const g = BY_ID.get(id);
  if (!g) throw new Error(`Unknown group: ${id}`);
  return g;
}

/** The criteria a group stands for, as objects. */
export function membersOf(g: CriterionGroup): Criterion[] {
  return g.members.map((id) => {
    const c = CRITERION_BY_ID.get(id);
    if (!c) throw new Error(`Group ${g.id} names an unknown criterion: ${id}`);
    return c;
  });
}

/** Raw points a group contributes when every member sits at its worst level. */
export function groupMaxPoints(g: CriterionGroup): number {
  return membersOf(g).reduce((sum, c) => sum + Math.max(...c.points), 0);
}

/**
 * The shared answer of a group, where it has one.
 *
 * `undefined` means either untouched or answered unevenly after being opened
 * up; the two are told apart by `groupAnswered`. A group showing no shared
 * level must not be rendered as unanswered, or a household that carefully split
 * one out would be asked to collapse it again.
 */
export function groupLevel(
  g: CriterionGroup,
  levels: Record<string, number>,
): number | undefined {
  const first = levels[g.members[0]];
  if (first === undefined) return undefined;
  return g.members.every((id) => levels[id] === first) ? first : undefined;
}

export function groupAnswered(
  g: CriterionGroup,
  levels: Record<string, number>,
): boolean {
  return g.members.every((id) => levels[id] !== undefined);
}

/** True where the group was opened up and its members no longer agree. */
export function groupIsSplit(
  g: CriterionGroup,
  levels: Record<string, number>,
): boolean {
  return groupAnswered(g, levels) && groupLevel(g, levels) === undefined;
}

/** Set every member of a group to one level. */
export function applyGroupLevel(
  g: CriterionGroup,
  level: number,
  levels: Record<string, number>,
): Record<string, number> {
  const next = { ...levels };
  for (const c of membersOf(g)) {
    // 4.13 has three outcomes where the rest have four. A group made of it
    // alone never needs the clamp, but a shared level must never be written
    // out of range for any member it lands on.
    next[c.id] = Math.min(level, c.points.length - 1);
  }
  return next;
}

/**
 * Every scored criterion belongs to exactly one group.
 *
 * Asserted by the tests rather than assumed: a criterion left out of this file
 * would silently never be asked and would score zero forever, which is the
 * failure mode that quietly costs a family a grade.
 */
export function groupedCriterionIds(): string[] {
  return GROUPS.flatMap((g) => [...g.members]);
}
