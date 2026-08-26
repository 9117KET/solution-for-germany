/**
 * Everyday wording for the assessment questions.
 *
 * The official instrument is written in administrative German: nominalised,
 * genitive-stacked phrases like "Mundgerechtes Zubereiten der Nahrung und
 * Eingießen von Getränken". People answer that question wrongly not because
 * they misjudge the care needed but because they cannot parse the sentence.
 *
 * This file is a separate overlay rather than extra fields on `criteria.ts` for
 * a reason: that file is a transcription of a legal instrument and its value
 * comes from being verifiable line by line against the source. Rewording lives
 * here, where it can be reviewed as writing, and the official text is never
 * edited or lost.
 *
 * The rewriting follows the rules German plain language ("Leichte Sprache")
 * sets out, which BITV 2.0 requires of public bodies: short sentences, active
 * voice, no genitive chains, no abbreviations, no subjunctive, and concrete
 * verbs in place of nominalisations.
 *
 * Both wordings are shown together in the interface: the everyday phrasing
 * leads and the official phrasing sits underneath in small type, so that nobody
 * is cut off from the terminology the assessor will actually use.
 */

import type { Localised } from '../i18n';
import type { ConditionId, ScaleVariant } from './criteria';

/** Criterion id → everyday wording. */
export const PLAIN_CRITERIA: Record<string, Localised> = {
  // ------------------------------------------------------------------ Modul 1
  '1.1': { de: 'Sich im Bett umdrehen', en: 'Turning over in bed' },
  '1.2': { de: 'Aufrecht sitzen bleiben', en: 'Staying sitting upright' },
  '1.3': { de: 'Vom Bett auf einen Stuhl wechseln', en: 'Moving from the bed to a chair' },
  '1.4': { de: 'In der Wohnung umhergehen', en: 'Getting around inside the home' },
  '1.5': { de: 'Treppen steigen', en: 'Going up and down stairs' },

  // ------------------------------------------------------------------ Modul 2
  '2.1': { de: 'Bekannte Menschen erkennen', en: 'Recognising people they know' },
  '2.2': { de: 'Wissen, wo sie ist', en: 'Knowing where they are' },
  '2.3': { de: 'Wissen, welcher Tag ist', en: 'Knowing what day it is' },
  '2.4': { de: 'Sich an wichtige Dinge erinnern', en: 'Remembering important things' },
  '2.5': {
    de: 'Etwas mit mehreren Schritten tun, zum Beispiel Kaffee kochen',
    en: 'Doing something with several steps, such as making coffee',
  },
  '2.6': { de: 'Sich im Alltag entscheiden', en: 'Making everyday decisions' },
  '2.7': { de: 'Erklärungen verstehen', en: 'Understanding explanations' },
  '2.8': { de: 'Gefahren erkennen', en: 'Spotting danger' },
  '2.9': { de: 'Sagen, was sie braucht', en: 'Saying what they need' },
  '2.10': {
    de: 'Verstehen, wenn man sie um etwas bittet',
    en: 'Understanding when someone asks them to do something',
  },
  '2.11': { de: 'Bei einem Gespräch mitmachen', en: 'Joining in a conversation' },

  // ------------------------------------------------------------------ Modul 3
  '3.1': { de: 'Unruhig umherlaufen', en: 'Restless pacing or wandering off' },
  '3.2': { de: 'Nachts unruhig sein', en: 'Being restless at night' },
  '3.3': { de: 'Sich selbst wehtun', en: 'Hurting themselves' },
  '3.4': { de: 'Sachen kaputt machen', en: 'Breaking things' },
  '3.5': { de: 'Andere schlagen oder stoßen', en: 'Hitting or pushing other people' },
  '3.6': { de: 'Andere beschimpfen', en: 'Shouting insults at people' },
  '3.7': { de: 'Laut rufen oder schreien', en: 'Calling out or screaming' },
  '3.8': { de: 'Sich gegen Hilfe wehren', en: 'Fighting off help' },
  '3.9': {
    de: 'Dinge glauben oder sehen, die nicht stimmen',
    en: 'Believing or seeing things that are not real',
  },
  '3.10': { de: 'Große Angst haben', en: 'Being very frightened' },
  '3.11': {
    de: 'Traurig sein und zu nichts Lust haben',
    en: 'Being low and not wanting to do anything',
  },
  '3.12': { de: 'Sich vor anderen unpassend verhalten', en: 'Behaving oddly around other people' },
  '3.13': { de: 'Andere unpassende Handlungen', en: 'Other behaviour that causes problems' },

  // ------------------------------------------------------------------ Modul 4
  '4.1': { de: 'Den Oberkörper vorne waschen', en: 'Washing the front of the upper body' },
  '4.2': { de: 'Haare kämmen, Zähne putzen, rasieren', en: 'Combing hair, brushing teeth, shaving' },
  '4.3': { de: 'Den Intimbereich waschen', en: 'Washing the private area' },
  '4.4': { de: 'Duschen oder baden und die Haare waschen', en: 'Showering or bathing, and washing hair' },
  '4.5': { de: 'Ein Oberteil an- und ausziehen', en: 'Putting on and taking off a top' },
  '4.6': { de: 'Hose und Schuhe an- und ausziehen', en: 'Putting on and taking off trousers and shoes' },
  '4.7': { de: 'Essen klein schneiden und Getränke eingießen', en: 'Cutting food up and pouring drinks' },
  '4.8': { de: 'Selbst essen', en: 'Eating without help' },
  '4.9': { de: 'Selbst trinken', en: 'Drinking without help' },
  '4.10': { de: 'Auf die Toilette gehen', en: 'Getting to and using the toilet' },
  '4.11': {
    de: 'Damit umgehen, wenn Urin abgeht',
    en: 'Coping when urine comes away',
  },
  '4.12': {
    de: 'Damit umgehen, wenn Stuhl abgeht',
    en: 'Coping when stool comes away',
  },
  '4.13': {
    de: 'Essen über einen Schlauch oder über die Vene',
    en: 'Being fed through a tube or through a vein',
  },

  // ------------------------------------------------------------------ Modul 6
  '6.1': { de: 'Den Tag selbst einteilen', en: 'Planning their own day' },
  '6.2': { de: 'Ruhen und schlafen', en: 'Resting and sleeping' },
  '6.3': { de: 'Sich selbst beschäftigen', en: 'Finding something to do' },
  '6.4': { de: 'Etwas für später planen', en: 'Planning something for later' },
  '6.5': { de: 'Mit Menschen reden, die da sind', en: 'Getting on with people who are there' },
  '6.6': {
    de: 'Kontakt zu Menschen außerhalb halten',
    en: 'Keeping in touch with people further away',
  },
};

/** Module 5 criterion id → everyday wording. */
export const PLAIN_M5: Record<string, Localised> = {
  '5.1': { de: 'Medikamente geben', en: 'Giving medicines' },
  '5.2': { de: 'Spritzen geben', en: 'Giving injections' },
  '5.3': { de: 'Einen Zugang in der Vene versorgen', en: 'Looking after a line in a vein' },
  '5.4': { de: 'Absaugen oder Sauerstoff geben', en: 'Suctioning, or giving oxygen' },
  '5.5': { de: 'Einreiben, kühlen oder wärmen', en: 'Rubbing in creams, cooling or warming' },
  '5.6': {
    de: 'Messen, zum Beispiel Blutzucker oder Blutdruck',
    en: 'Taking readings, such as blood sugar or blood pressure',
  },
  '5.7': {
    de: 'Ein Hilfsmittel am Körper anlegen, zum Beispiel eine Prothese',
    en: 'Putting on something worn on the body, such as a prosthesis',
  },
  '5.8': { de: 'Verbände wechseln und Wunden versorgen', en: 'Changing dressings and treating wounds' },
  '5.9': { de: 'Einen künstlichen Ausgang versorgen', en: 'Looking after an artificial opening' },
  '5.10': {
    de: 'Einen Katheter legen oder beim Stuhlgang nachhelfen',
    en: 'Using a catheter, or helping the bowels along',
  },
  '5.11': { de: 'Therapie zu Hause machen', en: 'Doing therapy at home' },
  '5.12': {
    de: 'Aufwendige Behandlung zu Hause mit Geräten',
    en: 'Demanding treatment at home, with equipment',
  },
  '5.13': { de: 'Zum Arzt fahren', en: 'Going to the doctor' },
  '5.14': {
    de: 'Zu einer Behandlung fahren, bis 3 Stunden',
    en: 'Going somewhere for treatment, up to 3 hours',
  },
  '5.15': {
    de: 'Zu einer Behandlung fahren, über 3 Stunden',
    en: 'Going somewhere for treatment, over 3 hours',
  },
  '5.16': {
    de: 'Eine Diät oder andere Vorschriften einhalten',
    en: 'Sticking to a diet, or to other rules',
  },
};

/** Gating question → everyday wording. */
export const PLAIN_CONDITIONS: Record<ConditionId, Localised> = {
  hasIncontinence: {
    de: 'Geht manchmal Urin oder Stuhl ab, ohne dass die Person es will?',
    en: 'Does urine or stool sometimes come away without the person meaning it to?',
  },
  hasStomaOrCatheter: {
    de: 'Hat die Person einen Katheter oder einen künstlichen Ausgang am Bauch?',
    en: 'Does the person have a catheter, or an artificial opening on the belly?',
  },
  hasTubeFeeding: {
    de: 'Bekommt die Person ihr Essen über einen Schlauch oder über die Vene?',
    en: 'Does the person get food through a tube, or through a vein?',
  },
  hasMedicalMeasures: {
    de: 'Braucht die Person regelmäßig Medikamente, Verbände, Spritzen oder Therapien?',
    en: 'Does the person regularly need medicines, dressings, injections or therapy?',
  },
  // "Gebrauchsunfähig" is the word the rule uses and the word families get
  // wrong: it sounds like nothing moves at all, while the rule still counts a
  // hand that can nudge a joystick. The everyday version leads with what the
  // person cannot do, and keeps the joystick, because that example is what
  // makes someone answer yes who would otherwise answer no.
  hasLimbUnusability: {
    de:
      'Kann die Person mit den Händen nichts mehr greifen und weder stehen noch ' +
      'gehen, auch nicht mit Hilfsmitteln? Ganz kleine Restbewegungen zählen ' +
      'trotzdem dazu, zum Beispiel einen Rollstuhl mit dem Ellenbogen steuern.',
    en:
      'Can the person no longer grip anything with their hands, and neither ' +
      'stand nor walk, even with aids? Very small remaining movements still ' +
      'count, for example steering a wheelchair with an elbow.',
  },
};

/**
 * Everyday wording for the answer scales.
 *
 * These matter more than any single question. "überwiegend unselbständig" is
 * the official third level of the independence scale, and it is the phrase
 * people most often pick wrongly, because it reads as though it might mean the
 * opposite of what it does.
 */
export const PLAIN_SCALE: Record<ScaleVariant, ReadonlyArray<Localised>> = {
  independence: [
    { de: 'Schafft sie allein', en: 'Manages alone' },
    { de: 'Schafft sie fast allein', en: 'Manages almost alone' },
    { de: 'Braucht viel Hilfe', en: 'Needs a lot of help' },
    { de: 'Schafft sie nicht allein', en: 'Cannot do it alone' },
  ],
  ability: [
    { de: 'Kein Problem', en: 'No problem' },
    { de: 'Ein kleines Problem', en: 'A small problem' },
    { de: 'Ein großes Problem', en: 'A big problem' },
    { de: 'Geht gar nicht', en: 'Not at all' },
  ],
  frequency: [
    { de: 'Nie oder fast nie', en: 'Never, or almost never' },
    { de: 'Ein- bis dreimal in der Woche', en: 'One to three times a week' },
    { de: 'Mehrmals in der Woche', en: 'Several times a week' },
    { de: 'Jeden Tag', en: 'Every day' },
  ],
  tubeFeeding: [
    { de: 'Nicht jeden Tag, oder gar nicht', en: 'Not every day, or not at all' },
    {
      de: 'Jeden Tag, und die Person isst auch mit dem Mund',
      en: 'Every day, and the person also eats by mouth',
    },
    { de: 'Fast nur über den Schlauch', en: 'Almost only through the tube' },
  ],
};
