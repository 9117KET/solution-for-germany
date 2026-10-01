/**
 * The letters behind the first step on the report.
 *
 * The report tells a family what to do; this writes the document that does
 * it. A recommendation to "lodge an objection within a month" is where most
 * people stop, because the next thing it asks of them is a formal German
 * letter, often in a second language, often at the end of a day of care.
 *
 * Three letters, matching the three actions that carry a `generates`:
 *
 *  - Widerspruch: against a Bescheid that awarded too low a grade (§ 84 SGG).
 *  - Antrag auf Höherstufung: a fresh request once the objection window closed.
 *  - Antrag auf Leistungen: the first application, where no grade is held.
 *
 * Rules the text keeps to:
 *
 *  1. Always German. The letter goes to the Pflegekasse, whatever language the
 *     interface is in, for the same reason the PDF report is German or English.
 *  2. No euro figures. The letter asks for a grade, not for an amount, and an
 *     amount the insurer disagrees with only gives them something to rebut.
 *  3. It cites the family's own answers, and only those that describe a need.
 *     That is what turns a form letter into a reasoned objection, and listing
 *     every "selbständig" as well would argue against the person.
 *  4. The estimate is stated as an estimate. Where the intake stopped at a
 *     range, the letter says "mindestens" and names the low end.
 *  5. Nothing is invented. A detail the person did not give stays a visible
 *     placeholder, so a printed letter can be completed by hand.
 *
 * Personal details live only in the form on the report and in the file the
 * person downloads. They are never written to the device.
 */

import type { ConditionId } from '../intake/criteria';
import { GROUPS, groupAnswered, groupLevel, membersOf } from '../intake/groups';
import { M5_BANDS } from '../intake/m5-bands';
import { criterionLabel, scaleOptions } from '../intake/readable';
import { M5_INTENSIVE_BANDS, type IntakeAnswers } from '../intake/score';
import { formatDate, localToday, type Pflegegrad } from '../rules';

export type LetterKind = 'widerspruch-pflegegrad' | 'antrag-hoeherstufung' | 'antrag-pflegegrad';

export interface LetterDetails {
  /** The person who needs care, as it appears on the insurance card. */
  personName?: string;
  /** ISO date. */
  birthDate?: string;
  /** Street, postcode and town, one line each. */
  address?: string;
  insuranceNumber?: string;
  /** Name and address of the Pflegekasse, one line each. */
  insurer?: string;
  /** Set when someone writes on the person's behalf. */
  representative?: {
    name?: string;
    address?: string;
  };
  /** ISO date of the Bescheid, for the objection. */
  bescheidDate?: string;
}

export interface LetterInput {
  kind: LetterKind;
  details: LetterDetails;
  currentGrade: Pflegegrad;
  /** The estimate, or the low end of the range when `atLeast` is set. */
  estimatedGrade: Pflegegrad;
  /** The intake stopped at a range; the letter claims only its low end. */
  atLeast: boolean;
  atHome: boolean;
  answers: IntakeAnswers;
  /** ISO date the letter is dated; today unless a test says otherwise. */
  today?: string;
}

export interface Letter {
  kind: LetterKind;
  sender: string[];
  recipient: string[];
  /** "Ort, Datum" line. */
  dateLine: string;
  subject: string;
  salutation: string;
  /** Paragraphs, in order. A paragraph followed by `needs` introduces them. */
  before: string[];
  needs: string[];
  after: string[];
  closing: string;
  signature: string;
  enclosures: string[];
}

/** Placeholder for a detail the person did not give. Bracketed so it shows. */
const blank = (what: string) => `[${what}]`;

const lines = (v: string | undefined, placeholder: string) => {
  const out = (v ?? '')
    .split(/\r?\n|,\s*(?=\d{5}\b)/)
    .map((l) => l.trim())
    .filter(Boolean);
  return out.length > 0 ? out : [blank(placeholder)];
};

const de = (iso: string) => formatDate(iso, 'de-DE');

/**
 * Screening answers as statements. On screen they are questions; in a letter
 * "Gibt es Probleme mit …?: Ja" reads as a form pasted in, not as a reason.
 */
const CONDITION_STATEMENT: Partial<Record<ConditionId, string>> = {
  hasCognitiveIssues: 'Beeinträchtigungen der kognitiven und kommunikativen Fähigkeiten',
  hasBehaviourIssues: 'Verhaltensweisen und psychische Problemlagen',
  hasIncontinence: 'Einschränkungen bei der Kontrolle von Blase oder Darm',
  hasLimbUnusability: 'Gebrauchsunfähigkeit beider Arme und beider Beine',
  hasTubeFeeding: 'Ernährung über eine Sonde oder parenteral',
};

/** The official module 5 groupings, named the way the Gutachten names them. */
const M5_NAME: Record<string, string> = {
  daily:
    'Medikation, Injektionen, Versorgung intravenöser Zugänge, Absaugen, Sauerstoff, ' +
    'Einreibungen, Messung von Körperzuständen, Hilfsmittel (5.1–5.7)',
  weekly: 'Verbandswechsel und Wundversorgung, Stoma, Katheter, Therapiemaßnahmen (5.8–5.11)',
  intensive:
    'Arztbesuche, Besuche medizinischer oder therapeutischer Einrichtungen, ' +
    'zeit- und technikintensive Maßnahmen (5.12–5.15)',
};

/**
 * The person's needs, in the instrument's own wording, one line each.
 *
 * Only answers that describe a need: listing every "selbständig" as well would
 * argue against the person the letter is written for. Where a group was
 * answered as one question it appears once, under the group's official label.
 */
export function letterNeeds(answers: IntakeAnswers): string[] {
  const out: string[] = [];

  for (const [id, statement] of Object.entries(CONDITION_STATEMENT)) {
    if (answers.conditions[id as ConditionId] === true) out.push(statement);
  }

  for (const g of GROUPS) {
    if (!groupAnswered(g, answers.levels)) continue;
    const shared = groupLevel(g, answers.levels);
    if (shared !== undefined) {
      if (shared > 0) out.push(`${g.label.de}: ${scaleOptions(g.scale)[shared].de}`);
      continue;
    }
    for (const c of membersOf(g)) {
      const level = answers.levels[c.id];
      if (level === undefined || level === 0) continue;
      out.push(`${criterionLabel(c).de}: ${scaleOptions(c.scale)[level].de}`);
    }
  }

  for (const band of M5_BANDS) {
    const v = answers.m5?.[band.id];
    if (!v) continue;
    const index =
      band.id === 'intensive' ? M5_INTENSIVE_BANDS.indexOf(v as 0 | 1 | 2 | 3 | 6) : v;
    const option = band.options[index];
    if (option) out.push(`${M5_NAME[band.id]}: ${option.de}`);
  }

  if (answers.dietLevel) {
    out.push(
      `Einhalten einer Diät oder anderer krankheitsbedingter Verhaltensvorschriften (5.16): ` +
        scaleOptions('independence')[answers.dietLevel].de,
    );
  }

  return out;
}

export function buildLetter(input: LetterInput): Letter {
  const { kind, details, currentGrade, estimatedGrade, atLeast, atHome, answers } = input;
  const today = input.today ?? localToday();
  const rep = details.representative;

  const name = details.personName?.trim() || blank('Name der pflegebedürftigen Person');
  const born = details.birthDate ? `, geboren am ${de(details.birthDate)}` : '';
  const insNo = details.insuranceNumber?.trim() || blank('Versichertennummer');
  const signer = rep ? rep.name?.trim() || blank('Ihr Name') : name;

  const sender = rep
    ? [signer, ...lines(rep.address, 'Ihre Anschrift')]
    : [name, ...lines(details.address, 'Anschrift')];

  const estimate = atLeast
    ? `mindestens Pflegegrad ${estimatedGrade}`
    : `Pflegegrad ${estimatedGrade}`;
  const assessed =
    `Nach unserer Einschätzung anhand der Kriterien des Begutachtungsinstruments ` +
    `(§ 15 SGB XI) liegen die Voraussetzungen für ${estimate} vor.`;

  const needs = letterNeeds(answers);
  const needsIntro =
    needs.length > 0
      ? rep
        ? `Im Alltag ist ${name} insbesondere in folgenden Bereichen auf Hilfe angewiesen:`
        : 'Im Alltag bin ich insbesondere in folgenden Bereichen auf Hilfe angewiesen:'
      : '';

  // Someone writing for a parent says so, and encloses the authority to.
  const onBehalf = rep
    ? `Ich schreibe in Vertretung von ${name}${born}. Eine Vollmacht liegt bei.`
    : '';
  const enclosures = rep ? ['Vollmacht'] : [];
  const confirm = 'Bitte bestätigen Sie mir den Eingang dieses Schreibens schriftlich.';
  // The insurance number identifies the person; the birth date goes with the
  // name only where someone else is writing, where it removes any doubt.
  const forPerson = rep ? `für ${name}` : 'für mich';

  let subject: string;
  let before: string[];
  let after: string[];

  switch (kind) {
    case 'widerspruch-pflegegrad': {
      const date = details.bescheidDate ? de(details.bescheidDate) : blank('Datum des Bescheids');
      subject = `Widerspruch gegen Ihren Bescheid vom ${date}, Versichertennummer ${insNo}`;
      before = [
        `hiermit lege ich gegen Ihren Bescheid vom ${date}, mit dem ${forPerson} ` +
          `Pflegegrad ${currentGrade} festgestellt wurde, Widerspruch ein.`,
        onBehalf,
        `Die Einstufung gibt den tatsächlichen Hilfebedarf nicht zutreffend wieder. ${assessed}`,
        needsIntro,
      ];
      after = [
        'Bitte senden Sie mir das vollständige Gutachten des Medizinischen Dienstes zu. ' +
          'Eine ausführliche Begründung reiche ich nach Erhalt des Gutachtens nach.',
        'Ich bitte um eine erneute Begutachtung. Bitte stimmen Sie den Termin rechtzeitig ab, ' +
          'damit eine Pflegeperson dabei sein kann.',
        confirm,
      ];
      break;
    }
    case 'antrag-hoeherstufung': {
      subject = `Antrag auf Höherstufung des Pflegegrades, Versichertennummer ${insNo}`;
      before = [
        `hiermit beantrage ich ${forPerson} eine erneute Begutachtung und die ` +
          `Einstufung in einen höheren Pflegegrad. Derzeit ist Pflegegrad ${currentGrade} anerkannt.`,
        onBehalf,
        `Der Hilfebedarf ist höher, als die bisherige Einstufung abbildet. ${assessed}`,
        needsIntro,
      ];
      after = [
        'Bitte beauftragen Sie den Medizinischen Dienst mit der Begutachtung und senden ' +
          'Sie mir das Gutachten zu. Bitte stimmen Sie den Termin rechtzeitig ab, damit ' +
          'eine Pflegeperson dabei sein kann.',
        confirm,
      ];
      break;
    }
    case 'antrag-pflegegrad': {
      subject = `Antrag auf Leistungen der Pflegeversicherung, Versichertennummer ${insNo}`;
      before = [
        `hiermit beantrage ich ${forPerson} Leistungen der Pflegeversicherung ` +
          `ab dem Datum dieses Schreibens und die Feststellung des Pflegegrades.`,
        onBehalf,
        `Die Pflege findet ${atHome ? 'zu Hause' : 'in einer Pflegeeinrichtung'} statt. ${assessed}`,
        needsIntro,
      ];
      after = [
        'Bitte beauftragen Sie den Medizinischen Dienst mit der Begutachtung und senden ' +
          'Sie mir gegebenenfalls noch benötigte Antragsformulare zu.',
        'Zugleich bitte ich um eine kostenlose Pflegeberatung nach § 7a SGB XI.',
        confirm,
      ];
      break;
    }
  }

  return {
    kind,
    sender,
    recipient: lines(details.insurer, 'Name und Anschrift der Pflegekasse'),
    dateLine: `${blank('Ort')}, ${de(today)}`,
    subject,
    salutation: 'Sehr geehrte Damen und Herren,',
    before: before.filter(Boolean),
    needs,
    after,
    closing: 'Mit freundlichen Grüßen',
    signature: signer,
    enclosures,
  };
}

/** The letter as plain text, for copying into an email draft or a word processor. */
export function letterText(l: Letter): string {
  const out: string[] = [
    l.sender.join('\n'),
    '',
    l.recipient.join('\n'),
    '',
    l.dateLine,
    '',
    l.subject,
    '',
    l.salutation,
    '',
  ];
  for (const p of l.before) out.push(p, '');
  if (l.needs.length > 0) {
    out.push(l.needs.map((n) => `- ${n}`).join('\n'), '');
  }
  for (const p of l.after) out.push(p, '');
  out.push(l.closing, '', '', l.signature);
  if (l.enclosures.length > 0) out.push('', `Anlage: ${l.enclosures.join(', ')}`);
  return out.join('\n');
}

const FILE: Record<LetterKind, string> = {
  'widerspruch-pflegegrad': 'widerspruch-pflegegrad',
  'antrag-hoeherstufung': 'antrag-hoeherstufung',
  'antrag-pflegegrad': 'antrag-pflegeleistungen',
};

export function letterFileName(kind: LetterKind, today = localToday()): string {
  return `${FILE[kind]}-${today}.pdf`;
}

/**
 * Lay the letter out roughly to DIN 5008.
 *
 * Built on the device like the report PDF; jsPDF is only fetched when someone
 * asks for a file. Kept apart from the download so it can be checked without
 * a browser.
 */
export async function renderLetterPdf(l: Letter) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const page = { w: 595.28, h: 841.89 };
  // 25 mm left, 20 mm right, in points.
  const left = 70.87;
  const width = page.w - left - 56.69;
  const size = 11;
  const lh = size * 1.35;
  let y = 76;

  const room = (needed: number) => {
    if (y + needed <= page.h - 60) return;
    doc.addPage();
    y = 70;
  };
  const write = (value: string, { bold = false, indent = 0, gap = 0 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor('#000000');
    const all = doc.splitTextToSize(value, width - indent) as string[];
    // A short paragraph moves to the next page whole rather than breaking
    // mid-sentence; a long one may still break.
    if (all.length <= 6) room(lh * all.length);
    for (const line of all) {
      room(lh);
      doc.text(line, left + indent, y);
      y += lh;
    }
    y += gap;
  };

  for (const s of l.sender) write(s);
  y = Math.max(y + lh, 150);
  for (const r of l.recipient) write(r);
  y = Math.max(y + lh * 2, 270);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.text(l.dateLine, page.w - 56.69, y, { align: 'right' });
  y += lh * 2;
  write(l.subject, { bold: true, gap: lh });
  write(l.salutation, { gap: lh * 0.6 });
  for (const p of l.before) write(p, { gap: lh * 0.6 });
  for (const n of l.needs) {
    const parts = doc.splitTextToSize(n, width - 14) as string[];
    room(lh * parts.length);
    doc.text('–', left, y);
    write(n, { indent: 14 });
  }
  if (l.needs.length > 0) y += lh * 0.6;
  for (const p of l.after) write(p, { gap: lh * 0.6 });
  room(lh * 5);
  write(l.closing, { gap: lh * 2.5 });
  write(l.signature);
  if (l.enclosures.length > 0) {
    y += lh;
    write(`Anlage: ${l.enclosures.join(', ')}`);
  }

  return doc;
}

/** Render the letter and hand it to the browser's download. */
export async function downloadLetterPdf(l: Letter): Promise<string> {
  const doc = await renderLetterPdf(l);
  const name = letterFileName(l.kind);
  doc.save(name);
  return name;
}
