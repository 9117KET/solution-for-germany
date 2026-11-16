/**
 * The PDF is the document a family hands across a desk, so what it says is
 * pinned here: the grade, the money, the actions with their statute, the
 * answers, and the two notices. `jspdf` is replaced by a recorder, because the
 * point is which text is written, not how the bytes are laid out; the real
 * writer is exercised in the browser by `e2e/pdf.e2e.ts`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyse, assess, euro, formatEuro, SOURCES, type RawScores } from '../rules';
import type { GradeBounds } from '../intake/adaptive';
import { downloadReportPdf, pdfFileName, type PdfInput } from './pdf';

const written: string[] = [];
const saved: string[] = [];
let pages = 1;

vi.mock('jspdf', () => ({
  jsPDF: class {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    line() {}
    setPage() {}
    splitTextToSize(value: string) {
      return [value];
    }
    text(value: string | string[]) {
      written.push(...(Array.isArray(value) ? value : [value]));
    }
    addPage() {
      pages += 1;
    }
    getNumberOfPages() {
      return pages;
    }
    save(name: string) {
      saved.push(name);
    }
  },
}));

const zero: RawScores = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };

const settled = (grade: 0 | 1 | 2 | 3 | 4 | 5, points: number): GradeBounds => ({
  low: grade,
  high: grade,
  lowPoints: points,
  highPoints: points,
  lowFromPoints: grade,
  highFromPoints: grade,
  resolved: true,
});

function input(over: Partial<PdfInput> = {}): PdfInput {
  const assessment = assess({ ...zero, m1: 4, m2: 6, m4: 8, m5: 2, m6: 4 });
  const report = analyse({
    currentGrade: 2,
    assessment,
    claimed: { pflegegeld: euro(347) },
    circumstances: { atHome: true, sharedHousehold: false, wantsHomeAdaptation: false },
  });
  return {
    lang: 'de',
    report,
    assessment,
    bounds: settled(assessment.grade, assessment.totalWeighted),
    answers: [{ question: 'Treppensteigen', answer: 'überwiegend unselbständig' }],
    asked: 20,
    officialQuestions: 64,
    ...over,
  };
}

const all = () => written.join('\n');

beforeEach(() => {
  written.length = 0;
  saved.length = 0;
  pages = 1;
});

describe('pdfFileName', () => {
  const day = new Date('2026-11-16T10:00:00Z');

  it('is German for a German document and carries the date', () => {
    expect(pdfFileName('de', day)).toBe('anspruch-einschaetzung-2026-11-16.pdf');
  });

  it('is English for an English document', () => {
    expect(pdfFileName('en', day)).toBe('anspruch-care-estimate-2026-11-16.pdf');
  });
});

describe('downloadReportPdf', () => {
  it('saves one file and returns its name', async () => {
    const name = await downloadReportPdf(input());
    expect(saved).toEqual([name]);
    expect(name).toMatch(/^anspruch-einschaetzung-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('states the estimated and the awarded grade, and that it is no assessment', async () => {
    const data = input();
    await downloadReportPdf(data);
    expect(all()).toContain(`Voraussichtlicher Pflegegrad: Pflegegrad ${data.assessment.grade}`);
    expect(all()).toContain('Heute anerkannt: Pflegegrad 2');
    expect(all()).toContain('Keine Begutachtung, keine Rechtsberatung.');
    expect(all()).toContain('20 Fragen beantwortet, von 64 des amtlichen Instruments.');
  });

  it('writes "kein Pflegegrad" rather than "Pflegegrad 0"', async () => {
    const assessment = assess(zero);
    const report = analyse({
      currentGrade: 0,
      assessment,
      claimed: {},
      circumstances: { atHome: true, sharedHousehold: false, wantsHomeAdaptation: false },
    });
    await downloadReportPdf(input({ assessment, report, bounds: settled(0, 0) }));
    expect(all()).toContain('Voraussichtlicher Pflegegrad: kein Pflegegrad');
    expect(all()).not.toContain('Pflegegrad 0');
  });

  it('prints the monthly gap and twelve times it, in the figures of the report', async () => {
    const data = input();
    expect(data.report.monthlyGapTotal).toBeGreaterThan(0);
    await downloadReportPdf(data);
    expect(all()).toContain(`${formatEuro(data.report.monthlyGapTotal, 'de-DE')} im Monat`);
    expect(all()).toContain(`${formatEuro(data.report.monthlyGapTotal * 12, 'de-DE')} im Jahr`);
  });

  it('says so when no recurring money is missing', async () => {
    const data = input();
    await downloadReportPdf({
      ...data,
      report: { ...data.report, monthlyGapTotal: 0, onceGapTotal: 0 },
    });
    expect(all()).toContain('Nach diesen Angaben fehlt kein laufendes Geld.');
    expect(all()).not.toContain('im Jahr');
  });

  it('lists every action, numbered, with the statute it rests on', async () => {
    const data = input();
    expect(data.report.actions.length).toBeGreaterThan(0);
    await downloadReportPdf(data);
    data.report.actions.forEach((a, i) => {
      expect(written.some((line) => line.startsWith(`${i + 1}. ${a.title.de}`))).toBe(true);
      expect(written.some((line) => line.startsWith(SOURCES[a.source].law))).toBe(true);
    });
  });

  it('leaves ineligible benefits out of the breakdown', async () => {
    const data = input();
    // Mark one row ineligible: the breakdown must then drop exactly that row.
    const [first, ...rest] = data.report.gaps;
    const gaps = [{ ...first, status: 'ineligible' as const }, ...rest];
    await downloadReportPdf({ ...data, report: { ...data.report, gaps } });
    for (const g of rest) expect(written).toContain(g.benefit.name.de);
    expect(written).not.toContain(first.benefit.name.de);
  });

  it('lists the answers back, and omits the section when there are none', async () => {
    await downloadReportPdf(input());
    expect(written).toContain('Ihre Antworten');
    expect(written).toContain('Treppensteigen');
    expect(written).toContain('überwiegend unselbständig');

    written.length = 0;
    await downloadReportPdf(input({ answers: [] }));
    // The heading as a line of its own; the privacy notice also begins with these words.
    expect(written).not.toContain('Ihre Antworten');
  });

  it('carries the health-data notice and the right to free advice', async () => {
    await downloadReportPdf(input());
    expect(all()).toContain('gibt Gesundheitsdaten weiter');
    expect(all()).toContain('Pflegeberatung nach § 7a SGB XI ist kostenlos');
  });

  it('describes an open result as a range, never as "between 5 and 5"', async () => {
    const data = input();
    await downloadReportPdf({
      ...data,
      bounds: { ...settled(2, 30), high: 4, highPoints: 75, highFromPoints: 4, resolved: false },
    });
    expect(all()).toContain('zwischen Pflegegrad 2 und Pflegegrad 4');
    expect(all()).not.toContain('konnten dieses Ergebnis nicht mehr');
  });

  it('writes the whole document in English when asked', async () => {
    const data = input({ lang: 'en' });
    const name = await downloadReportPdf(data);
    expect(name).toMatch(/^anspruch-care-estimate-/);
    expect(all()).toContain('Your care estimate');
    expect(all()).toContain('Not an assessment, not legal advice.');
    expect(all()).toContain(`${formatEuro(data.report.monthlyGapTotal, 'en-IE')} a month`);
    expect(all()).not.toContain('Ihre Pflege-Einschätzung');
  });

  it('numbers every page', async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ question: `Frage ${i}`, answer: 'ja' }));
    await downloadReportPdf(input({ answers: many }));
    expect(pages).toBeGreaterThan(1);
    for (let p = 1; p <= pages; p += 1) expect(written).toContain(`Seite ${p}/${pages}`);
  });
});
