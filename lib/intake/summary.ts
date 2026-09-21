/**
 * The intake read back, question by question.
 *
 * Used for the PDF and for the "check your answers" panel on the report. Both
 * exist for the same reason: the estimate is only as good as what was typed in,
 * and the one thing a family can usefully check is not the arithmetic but
 * whether the answers describe the person.
 *
 * Only what was actually answered appears. A criterion that was never asked is
 * absent rather than listed as "independent", because a list that quietly
 * asserts things nobody said would be read as a record of the interview and is
 * exactly what a Sachbearbeiter must not be handed.
 *
 * Where a group was answered as a group, it appears once, under the group's
 * question. Where it was opened up and its criteria answered separately, they
 * appear separately. That mirrors what the person did.
 */

import { MODULES, type ModuleId } from '../rules/nba';
import { lead, official, type ContentLang, type Readable } from '../i18n';
import { CONDITIONS, criterion, type ConditionId } from './criteria';
import { GROUPS, groupAnswered, groupLevel, membersOf } from './groups';
import { M5_BANDS, M5_DIET_LABEL } from './m5-bands';
import { criterionLabel, conditionLabel, scaleOptions } from './readable';
import { M5_INTENSIVE_BANDS, type IntakeAnswers } from './score';
import { SCREENING } from './adaptive';

export interface AnswerLine {
  question: string;
  answer: string;
  /**
   * Which module the question belongs to, absent for the gating questions.
   *
   * Carried so the PDF can put the answers under module headings. The
   * Begutachtung is worked module by module and announced that way, and a
   * family following along on paper should be able to find its place when the
   * assessor says "Modul 4". A flat run of forty questions cannot be followed
   * in a room where somebody is talking.
   */
  module?: ModuleId;
  /** The module's name, in the reader's language, for the heading. */
  moduleName?: string;
}

const YES: Record<ContentLang, string> = { de: 'Ja', en: 'Yes' };
const NO: Record<ContentLang, string> = { de: 'Nein', en: 'No' };

export interface SummaryOptions {
  lang: ContentLang;
  /** Follow the reader's plain-words setting, as the questions on screen did. */
  plain: boolean;
}

export function answerLines(
  answers: IntakeAnswers,
  { lang, plain }: SummaryOptions,
): AnswerLine[] {
  const out: AnswerLine[] = [];
  const say = (r: Readable) => lead(r, lang, plain);
  // The official wording is kept alongside the everyday one, because this list
  // is meant to be usable at an appointment where the official words are spoken.
  const both = (r: Readable) => {
    const under = official(r, lang, plain);
    return under && under !== say(r) ? `${say(r)} (${under})` : say(r);
  };

  for (const id of [...SCREENING, 'hasTubeFeeding' as ConditionId]) {
    const v = answers.conditions[id];
    if (v === undefined) continue;
    out.push({ question: say(conditionLabel(id)), answer: v ? YES[lang] : NO[lang] });
  }

  /**
   * Module order, walked explicitly.
   *
   * The groups happen to be declared in module order, so iterating GROUPS used
   * to produce almost the right sequence -- but module 5 is asked as pooled
   * bands rather than as groups, so it was appended after everything else and
   * came out *after* module 6. On a document somebody follows during an
   * interview that is simply wrong, and it is the kind of wrong that makes a
   * reader lose their place and stop trusting the page.
   */
  const MODULE_ORDER: ModuleId[] = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
  const name = (m: ModuleId) => MODULES[m].name[lang];

  for (const m of MODULE_ORDER) {
    if (m === 'm5') {
      for (const band of M5_BANDS) {
        const v = answers.m5?.[band.id];
        if (v === undefined) continue;
        const index =
          band.id === 'intensive' ? M5_INTENSIVE_BANDS.indexOf(v as 0 | 1 | 2 | 3 | 6) : v;
        const option = band.options[index < 0 ? 0 : index];
        out.push({
          question: say(band.label),
          answer: option ? say(option) : String(v),
          module: 'm5',
          moduleName: name('m5'),
        });
      }
      if (answers.dietLevel !== undefined) {
        out.push({
          question: say(M5_DIET_LABEL),
          answer: say(scaleOptions('independence')[answers.dietLevel]),
          module: 'm5',
          moduleName: name('m5'),
        });
      }
      continue;
    }

    for (const g of GROUPS) {
      if (g.module !== m) continue;
      if (!groupAnswered(g, answers.levels)) continue;
      const shared = groupLevel(g, answers.levels);
      const options = scaleOptions(g.scale);
      if (shared !== undefined) {
        out.push({
          question: both(g.label),
          answer: say(options[shared]),
          module: m,
          moduleName: name(m),
        });
        continue;
      }
      // Opened up and answered unevenly: list the criteria the way they were given.
      for (const c of membersOf(g)) {
        const level = answers.levels[c.id];
        if (level === undefined) continue;
        out.push({
          question: both(criterionLabel(c)),
          answer: say(scaleOptions(c.scale)[level]),
          module: m,
          moduleName: name(m),
        });
      }
    }
  }

  return out;
}

/**
 * Criteria the household was never asked about.
 *
 * The report names these rather than hiding them: a person who is told the
 * intake stopped early is entitled to know what it stopped short of, and a
 * person who disagrees with the stopping can go back and answer them.
 */
export function unaskedCriterionLabels(
  answers: IntakeAnswers,
  { lang, plain }: SummaryOptions,
): string[] {
  const out: string[] = [];
  for (const g of GROUPS) {
    for (const c of membersOf(g)) {
      if (answers.levels[c.id] === undefined) out.push(lead(criterionLabel(c), lang, plain));
    }
  }
  return out;
}

/** A gating question and its answer, for the report's own use. */
export function conditionSummary(
  answers: IntakeAnswers,
  lang: ContentLang,
): Array<{ id: ConditionId; question: string; answer: boolean }> {
  return (Object.keys(CONDITIONS) as ConditionId[])
    .filter((id) => answers.conditions[id] !== undefined)
    .map((id) => ({
      id,
      question: CONDITIONS[id][lang],
      answer: answers.conditions[id] === true,
    }));
}

/** Re-exported so callers need only one import for the criterion lookup. */
export { criterion };
