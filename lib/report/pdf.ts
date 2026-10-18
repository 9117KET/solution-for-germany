/**
 * The result as a PDF, built in the browser.
 *
 * Everything here runs on the device. There is no render service, no upload,
 * no network call: `jspdf` is a pure-JavaScript writer, the bytes are assembled
 * in memory and handed to the browser's own download, and the file exists
 * nowhere else. That is the whole reason for choosing a client-side writer over
 * anything server-rendered, and it is the property to protect if this file is
 * ever changed. The library is imported dynamically so that a person who never
 * asks for a PDF never downloads it either.
 *
 * **The PDF is written in German or English, never in the other four interface
 * languages.** This is not a shortcut around font embedding, though it happens
 * to avoid it. The PDF is the artefact that gets handed across a desk at the
 * Pflegekasse or read out to a Sachbearbeiter, and a Turkish or Russian
 * document is of no use there. The interface stays in the reader's language;
 * the document they take with them is in the language of the form. The button
 * that produces it says so.
 *
 * What goes in it is chosen for that same moment. The estimate and the money
 * matter, but so does the list of answers: the assessment is an interview, and
 * a family that walks in with its own answers written down is a family that
 * does not have to remember, on the spot and under pressure, how often the
 * nights are bad.
 */

import type { ContentLang, Localised } from '../i18n';
import { formatEuro, SOURCES, type Assessment, type GapReport } from '../rules';
import { asOfMonth } from '../rules/freshness';
import type { GradeBounds } from '../intake/adaptive';
import type { AnswerLine as AnswerLineType } from '../intake/summary';

/**
 * One answered question, as the report lists it back.
 *
 * Re-exported from `summary.ts` rather than declared again here. Two
 * structurally identical interfaces in two files drifted apart the moment the
 * answers gained a module tag, and the duplicate is what let the PDF silently
 * fall behind the thing that feeds it.
 */
export type { AnswerLine } from '../intake/summary';

export interface PdfInput {
  lang: ContentLang;
  report: GapReport;
  assessment: Assessment;
  bounds: GradeBounds;
  answers: readonly AnswerLineType[];
  /** Questions asked, against the number the official instrument contains. */
  asked: number;
  officialQuestions: number;
}

const L = {
  title: { de: 'Ihre Pflege-Einschätzung', en: 'Your care estimate' },
  subtitle: {
    de: 'Erstellt mit Anspruch. Keine Begutachtung, keine Rechtsberatung.',
    en: 'Produced with Anspruch. Not an assessment, not legal advice.',
  },
  created: { de: 'Erstellt am', en: 'Created on' },
  estimate: { de: 'Die Einschätzung', en: 'The estimate' },
  estimatedGrade: { de: 'Voraussichtlicher Pflegegrad', en: 'Likely Pflegegrad' },
  currentGrade: { de: 'Heute anerkannt', en: 'Awarded today' },
  points: { de: 'Punkte von 100', en: 'points out of 100' },
  none: { de: 'kein Pflegegrad', en: 'no Pflegegrad' },
  settled: {
    de:
      'Die übrigen Fragen des Instruments konnten dieses Ergebnis nicht mehr ' +
      'verändern, deshalb wurden sie nicht gestellt.',
    en:
      'The remaining questions in the instrument could no longer change this ' +
      'result, so they were not asked.',
  },
  range: {
    de: 'Nach den Angaben liegt das Ergebnis zwischen Pflegegrad {low} und Pflegegrad {high}.',
    en: 'On these answers the result lies between Pflegegrad {low} and Pflegegrad {high}.',
  },
  asked: {
    de: '{asked} Fragen beantwortet, von {total} des amtlichen Instruments.',
    en: '{asked} questions answered, out of {total} in the official instrument.',
  },
  money: { de: 'Was möglicherweise fehlt', en: 'What may be missing' },
  perMonth: { de: 'im Monat', en: 'a month' },
  perYear: { de: 'im Jahr', en: 'a year' },
  once: { de: 'einmalig', en: 'one-off' },
  nothingMissing: {
    de: 'Nach diesen Angaben fehlt kein laufendes Geld.',
    en: 'On these answers no recurring money is missing.',
  },
  todo: { de: 'Was zu tun ist', en: 'What to do' },
  deadline: { de: 'Frist', en: 'Deadline' },
  breakdown: { de: 'Woher die Zahl kommt', en: 'Where the number comes from' },
  colBenefit: { de: 'Leistung', en: 'Benefit' },
  colEntitled: { de: 'Zusteht', en: 'Entitled' },
  colClaimed: { de: 'Bezogen', en: 'Claimed' },
  colGap: { de: 'Differenz', en: 'Difference' },
  yourAnswers: { de: 'Ihre Antworten', en: 'Your answers' },
  answersIntro: {
    de:
      'Nehmen Sie diese Liste zur Begutachtung mit. Der Medizinische Dienst ' +
      'fragt dasselbe, und wer die Antworten vor sich hat, vergisst im Termin ' +
      'weniger.',
    en:
      'Take this list to the assessment. The Medizinischer Dienst asks the same ' +
      'things, and having the answers to hand means forgetting less on the day.',
  },
  privacy: { de: 'Datenschutz', en: 'Data protection' },
  figuresAsOf: { de: 'Beträge zuletzt geprüft: ', en: 'Figures last checked: ' },
  privacyBody: {
    de:
      'Diese Datei wurde auf Ihrem Gerät erstellt. Ihre Antworten wurden nicht ' +
      'übertragen und nicht gespeichert, außer in diesem Browser auf diesem ' +
      'Gerät. Wer die Datei weitergibt, gibt Gesundheitsdaten weiter: Sie ' +
      'enthält Angaben über Pflegebedürftigkeit und ist entsprechend zu ' +
      'behandeln.',
    en:
      'This file was produced on your device. Your answers were not transmitted ' +
      'and not stored anywhere but in this browser on this device. Anyone who ' +
      'passes the file on is passing on health data: it records details of care ' +
      'needs and should be treated accordingly.',
  },
  advice: {
    de:
      'Pflegeberatung nach § 7a SGB XI ist kostenlos und ein Rechtsanspruch. ' +
      'Ihre Pflegekasse muss sie Ihnen vermitteln.',
    en:
      'Care advice under § 7a SGB XI is free and is a legal entitlement. Your ' +
      'Pflegekasse has to arrange it for you.',
  },
  page: { de: 'Seite', en: 'Page' },
} satisfies Record<string, Localised>;

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

// A4 in points, which is what jsPDF measures in at this setting.
const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const WIDTH = PAGE.w - MARGIN * 2;

/** Tuned so a full run stays inside four pages at a readable size. */
const SIZE = { h1: 22, h2: 13, body: 10, small: 8.5 };

export function pdfFileName(lang: ContentLang, now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return lang === 'de'
    ? `anspruch-einschaetzung-${date}.pdf`
    : `anspruch-care-estimate-${date}.pdf`;
}

/**
 * Build the document and hand it to the browser's download.
 *
 * Returns the file name so the caller can tell the person what landed, which
 * matters on a phone where the download is a line in a tray they may not see.
 */
export async function downloadReportPdf(input: PdfInput): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const { lang } = input;
  const t = (k: keyof typeof L) => L[k][lang];
  const money = (c: number) => formatEuro(c, lang === 'de' ? 'de-DE' : 'en-IE');

  let y = MARGIN;

  const room = (needed: number) => {
    if (y + needed <= PAGE.h - MARGIN - 24) return;
    doc.addPage();
    y = MARGIN;
  };

  const text = (
    value: string,
    { size = SIZE.body, bold = false, gap = 4, indent = 0, colour = '#111111' } = {},
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(colour);
    const lines: string[] = doc.splitTextToSize(value, WIDTH - indent);
    for (const line of lines) {
      room(size * 1.3);
      doc.text(line, MARGIN + indent, y);
      y += size * 1.3;
    }
    y += gap;
  };

  const heading = (value: string) => {
    room(46);
    y += 8;
    text(value, { size: SIZE.h2, bold: true, gap: 2 });
    doc.setDrawColor('#cccccc');
    doc.line(MARGIN, y - 2, PAGE.w - MARGIN, y - 2);
    y += 8;
  };

  // ------------------------------------------------------------- heading
  text(t('title'), { size: SIZE.h1, bold: true, gap: 2 });
  text(t('subtitle'), { size: SIZE.small, colour: '#555555', gap: 2 });
  text(
    `${t('created')} ${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-IE')}`,
    { size: SIZE.small, colour: '#555555' },
  );

  // ------------------------------------------------------------ estimate
  heading(t('estimate'));
  const grade = (g: number) => (g === 0 ? t('none') : `Pflegegrad ${g}`);
  text(`${t('estimatedGrade')}: ${grade(input.assessment.grade)}`, { bold: true, gap: 2 });
  text(`${input.assessment.totalWeighted} ${t('points')}`, {
    size: SIZE.small,
    colour: '#555555',
    gap: 2,
  });
  text(`${t('currentGrade')}: ${grade(input.report.currentGrade)}`, { gap: 4 });
  text(
    input.bounds.resolved
      ? t('settled')
      : fill(t('range'), { low: input.bounds.low, high: input.bounds.high }),
    { size: SIZE.small, colour: '#555555', gap: 2 },
  );
  text(fill(t('asked'), { asked: input.asked, total: input.officialQuestions }), {
    size: SIZE.small,
    colour: '#555555',
  });

  // --------------------------------------------------------------- money
  heading(t('money'));
  if (input.report.monthlyGapTotal > 0) {
    text(`${money(input.report.monthlyGapTotal)} ${t('perMonth')}`, {
      size: 18,
      bold: true,
      gap: 2,
    });
    text(`${money(input.report.monthlyGapTotal * 12)} ${t('perYear')}`, {
      size: SIZE.small,
      colour: '#555555',
    });
  } else {
    text(t('nothingMissing'));
  }
  if (input.report.onceGapTotal > 0) {
    text(`${money(input.report.onceGapTotal)} ${t('once')}`, { size: SIZE.small });
  }

  // ---------------------------------------------------------------- todo
  heading(t('todo'));
  input.report.actions.forEach((a, i) => {
    room(56);
    const value =
      a.monthlyValue != null
        ? ` · ${money(a.monthlyValue)} ${t('perMonth')}`
        : a.onceValue != null
          ? ` · ${money(a.onceValue)} ${t('once')}`
          : '';
    text(`${i + 1}. ${a.title[lang]}${value}`, { bold: true, gap: 1 });
    text(a.why[lang], { size: SIZE.small, indent: 14, gap: 1, colour: '#333333' });
    const deadline = a.deadline ? ` · ${t('deadline')}: ${a.deadline}` : '';
    text(`${SOURCES[a.source].law}${deadline}`, {
      size: SIZE.small,
      indent: 14,
      colour: '#555555',
      gap: 8,
    });
  });

  // ----------------------------------------------------------- breakdown
  const rows = input.report.gaps.filter((g) => g.status !== 'ineligible');
  if (rows.length > 0) {
    heading(t('breakdown'));
    const cols = [MARGIN, MARGIN + 250, MARGIN + 340, MARGIN + 425];
    const header = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(SIZE.small);
      doc.setTextColor('#111111');
      doc.text(t('colBenefit'), cols[0], y);
      doc.text(t('colEntitled'), cols[1], y);
      doc.text(t('colClaimed'), cols[2], y);
      doc.text(t('colGap'), cols[3], y);
      y += 14;
    };
    header();
    for (const g of rows) {
      room(30);
      if (y === MARGIN) header();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SIZE.small);
      doc.setTextColor('#111111');
      const name: string[] = doc.splitTextToSize(g.benefit.name[lang], 240);
      doc.text(name, cols[0], y);
      doc.text(money(g.entitled), cols[1], y);
      doc.text(money(g.claimed), cols[2], y);
      doc.setFont('helvetica', 'bold');
      doc.text(g.gap > 0 ? money(g.gap) : '-', cols[3], y);
      y += Math.max(name.length, 1) * 11 + 6;
    }
  }

  // ------------------------------------------------------------- answers
  if (input.answers.length > 0) {
    heading(t('yourAnswers'));
    text(t('answersIntro'), { size: SIZE.small, colour: '#555555', gap: 8 });

    // Under module headings, in the order the Begutachtung works through them.
    // The assessor announces the module out loud; a family that can find the
    // matching heading on the page can follow along, which is the entire point
    // of printing the answers in the first place.
    let currentModule: string | undefined;
    for (const a of input.answers) {
      if (a.moduleName && a.moduleName !== currentModule) {
        currentModule = a.moduleName;
        room(34);
        text(`${a.module?.toUpperCase().replace('M', 'Modul ')}: ${a.moduleName}`, {
          size: SIZE.small,
          bold: true,
          colour: '#111111',
          gap: 4,
        });
      }
      room(28);
      text(a.question, { size: SIZE.small, gap: 0, indent: a.moduleName ? 8 : 0 });
      text(a.answer, {
        size: SIZE.small,
        bold: true,
        indent: a.moduleName ? 22 : 14,
        colour: '#333333',
        gap: 6,
      });
    }
  }

  // ------------------------------------------------------------- privacy
  heading(t('privacy'));
  text(t('privacyBody'), { size: SIZE.small, colour: '#333333' });
  text(t('advice'), { size: SIZE.small, colour: '#333333' });

  // When the amounts were last checked against the statute.
  //
  // This matters more on paper than on the screen. The page can be corrected;
  // a printout carried to an appointment cannot, and it may be read weeks
  // later by somebody who has no idea how old it is. Saying so costs one line.
  text(`${t('figuresAsOf')}${asOfMonth(lang)}`, {
    size: SIZE.small,
    colour: '#333333',
  });

  // Page numbers last, once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(SIZE.small);
    doc.setTextColor('#777777');
    doc.text(`${t('page')} ${p}/${pages}`, PAGE.w - MARGIN, PAGE.h - 24, { align: 'right' });
  }

  const name = pdfFileName(lang);
  doc.save(name);
  return name;
}
