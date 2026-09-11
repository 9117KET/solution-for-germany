/**
 * Module 5, asked at the level it is scored at.
 *
 * The official instrument lists sixteen rows and asks how often each one
 * happens. It then pools them into three groups, converts each group total
 * against four thresholds, and keeps only the resulting band. Every bit of
 * precision below the threshold is discarded before it reaches the grade.
 *
 * So these four questions ask for the band directly, and the answer options are
 * written as the thresholds themselves: "1 to 3 times a day" is not a summary
 * of the official rows, it is the bracket the official rows are converted into.
 * The score is identical, which is why `adaptive.test.ts` computes it both ways
 * and asserts one number.
 *
 * The wording carries the whole burden here. A family that pictures only
 * tablets when asked about "measures" under-reports the group, so each question
 * lists what belongs in it, in the concrete nouns people use for these things.
 * The doubling rules in the third question come from the instrument: measures
 * at home needing time and equipment, and appointments running over three
 * hours, each count twice.
 */

import type { Readable } from '../i18n';
import type { M5BandId } from './adaptive';

export interface M5BandQuestion {
  id: M5BandId;
  label: Readable;
  /** Official rows this question stands in for, named in the report. */
  covers: readonly string[];
  /**
   * Option text, in order. The value each option writes is its index, except
   * for the intensive group, which uses `M5_INTENSIVE_BANDS`.
   */
  options: readonly Readable[];
}

export const M5_BANDS: readonly M5BandQuestion[] = [
  {
    id: 'daily',
    covers: ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7'],
    label: {
      de:
        'Wie oft am Tag sind ärztlich verordnete Maßnahmen nötig? Zählen Sie alles ' +
        'zusammen: Medikamente, Spritzen, Tropfen, einen Zugang in der Vene versorgen, ' +
        'absaugen oder Sauerstoff geben, einreiben, kühlen oder wärmen, Blutzucker ' +
        'oder Blutdruck messen, eine Prothese oder Stützstrümpfe anlegen.',
      en:
        'How many times a day are prescribed measures needed? Count them all ' +
        'together: medicines, injections, drops, caring for a line in a vein, ' +
        'suctioning or giving oxygen, rubbing in creams, cooling or warming, ' +
        'taking blood sugar or blood pressure readings, putting on a prosthesis ' +
        'or support stockings.',
    },
    options: [
      {
        de: 'Gar nicht, oder seltener als einmal am Tag',
        en: 'Not at all, or less than once a day',
      },
      { de: 'Ein- bis dreimal am Tag', en: 'One to three times a day' },
      { de: 'Vier- bis achtmal am Tag', en: 'Four to eight times a day' },
      { de: 'Mehr als achtmal am Tag', en: 'More than eight times a day' },
    ],
  },
  {
    id: 'weekly',
    covers: ['5.8', '5.9', '5.10', '5.11'],
    label: {
      de:
        'Wie oft sind Verbandswechsel oder Wundversorgung nötig, die Versorgung ' +
        'eines Katheters oder eines künstlichen Ausgangs, Hilfe beim Stuhlgang, ' +
        'oder Therapie zu Hause wie Krankengymnastik oder Logopädie?',
      en:
        'How often are dressing changes or wound care needed, care of a catheter ' +
        'or an artificial opening, help with the bowels, or therapy at home such ' +
        'as physiotherapy or speech therapy?',
    },
    options: [
      {
        de: 'Seltener als einmal in der Woche, oder gar nicht',
        en: 'Less than once a week, or not at all',
      },
      {
        de: 'Jede Woche, aber nicht jeden Tag',
        en: 'Every week, but not every day',
      },
      { de: 'Jeden Tag, ein- bis zweimal', en: 'Every day, once or twice' },
      {
        de: 'Jeden Tag, dreimal oder öfter',
        en: 'Every day, three times or more',
      },
    ],
  },
  {
    id: 'intensive',
    covers: ['5.12', '5.13', '5.14', '5.15'],
    label: {
      de:
        'Wie viele Termine außer Haus sind es im Monat: Arzt, Therapie, ' +
        'Krankenhaus, Ambulanz, Dialyse? Termine, die länger als drei Stunden ' +
        'dauern, zählen doppelt. Aufwendige Behandlungen zu Hause mit Geräten ' +
        'zählen ebenfalls doppelt.',
      en:
        'How many appointments outside the home are there in a month: doctor, ' +
        'therapy, hospital, outpatient clinic, dialysis? Appointments lasting ' +
        'more than three hours count twice. Demanding treatment at home with ' +
        'equipment counts twice as well.',
    },
    options: [
      { de: 'Bis zu vier im Monat', en: 'Up to four a month' },
      { de: 'Fünf bis acht im Monat', en: 'Five to eight a month' },
      { de: 'Neun bis zwölf im Monat', en: 'Nine to twelve a month' },
      { de: 'Dreizehn oder mehr im Monat', en: 'Thirteen or more a month' },
      {
        de:
          'Rund um die Uhr technische Unterstützung, zum Beispiel eine Beatmung',
        en: 'Round-the-clock technical support, for example ventilation',
      },
    ],
  },
];

/**
 * The diet question, which is scored on its own and not pooled with anything.
 *
 * It keeps the four-level independence scale the instrument gives it, so the
 * options come from `scaleOptions('independence')` rather than from here; only
 * the question needed rewriting, because "Einhaltung einer Diät oder anderer
 * krankheitsbedingter Verhaltensvorschriften" is not a sentence anyone answers
 * accurately on a phone.
 */
export const M5_DIET_LABEL: Readable = {
  de:
    'Muss die Person eine Diät einhalten oder andere Vorschriften wegen einer ' +
    'Krankheit, zum Beispiel wenig Salz, wenig Zucker, nichts trinken vor einer ' +
    'Dialyse? Wie gut schafft sie das allein?',
  en:
    'Does the person have to keep to a diet, or to other rules because of an ' +
    'illness, for example little salt, little sugar, nothing to drink before ' +
    'dialysis? How well do they manage that on their own?',
  easy: {
    de:
      'Muss die Person wegen einer Krankheit auf das Essen oder Trinken achten? ' +
      'Wie gut schafft sie das allein?',
    en:
      'Does the person have to watch what they eat or drink because of an ' +
      'illness? How well do they manage that on their own?',
  },
};

const BY_ID = new Map(M5_BANDS.map((b) => [b.id, b]));

export function m5Band(id: M5BandId): M5BandQuestion {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`Unknown module 5 band: ${id}`);
  return b;
}
