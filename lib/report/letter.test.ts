/**
 * The letters a family sends to the Pflegekasse.
 *
 * What matters is not layout but content a Sachbearbeiter will act on: the
 * right Bescheid, the right grades, the person's own needs, no money figures,
 * and nothing made up where a detail was not given.
 */
import { describe, it, expect } from 'vitest';
import { buildLetter, letterFileName, letterText, renderLetterPdf, type LetterInput } from './letter';
import { emptyIntake } from '../intake/score';

const answers = {
  ...emptyIntake(),
  conditions: { hasCognitiveIssues: true, hasBehaviourIssues: false },
  levels: { '4.1': 2, '4.2': 2, '4.3': 2, '4.4': 2, '1.1': 0, '1.2': 0 },
  m5: { daily: 1, weekly: 0 },
};

const input = (over: Partial<LetterInput> = {}): LetterInput => ({
  kind: 'widerspruch-pflegegrad',
  details: {
    personName: 'Erika Muster',
    birthDate: '1941-03-09',
    address: 'Hauptstraße 1, 91052 Erlangen',
    insuranceNumber: 'A123456789',
    insurer: 'Musterkasse\nPostfach 1\n90000 Nürnberg',
    bescheidDate: '2026-09-21',
  },
  currentGrade: 2,
  estimatedGrade: 4,
  atLeast: false,
  atHome: true,
  answers,
  today: '2026-10-01',
  ...over,
});

describe('the objection', () => {
  const l = buildLetter(input());
  const text = letterText(l);

  it('names the Bescheid, its date and the insurance number', () => {
    expect(l.subject).toBe(
      'Widerspruch gegen Ihren Bescheid vom 21.09.2026, Versichertennummer A123456789',
    );
    expect(text).toContain('Pflegegrad 2 festgestellt wurde, Widerspruch ein.');
  });

  it('states the estimate as an estimate, under § 15 SGB XI', () => {
    expect(text).toContain('Nach unserer Einschätzung');
    expect(text).toContain('§ 15 SGB XI');
    expect(text).toContain('Voraussetzungen für Pflegegrad 4 vor');
  });

  it('cites the needs, and only the needs', () => {
    expect(l.needs.length).toBeGreaterThan(0);
    // Mobility (1.x) was answered "selbständig" and the weekly band "none":
    // neither may appear.
    expect(l.needs.some((n) => /: selbständig$/.test(n))).toBe(false);
    expect(l.needs.some((n) => n.includes('5.8–5.11'))).toBe(false);
    expect(l.needs.some((n) => /überwiegend unselbständig$/.test(n))).toBe(true);
    expect(l.needs).toContain('Beeinträchtigungen der kognitiven und kommunikativen Fähigkeiten');
    expect(l.needs.some((n) => n.startsWith('Medikation') && n.endsWith('Ein- bis dreimal am Tag'))).toBe(true);
  });

  it('writes the needs as statements, not as the questions on screen', () => {
    expect(l.needs.every((n) => !n.includes('?'))).toBe(true);
  });

  it('opens with the objection, not with who is writing', () => {
    expect(l.before[0].startsWith('hiermit')).toBe(true);
  });

  it('asks for the Gutachten and a confirmation of receipt', () => {
    expect(text).toContain('vollständige Gutachten');
    expect(text).toContain('Eingang dieses Schreibens');
  });

  it('carries no money figure', () => {
    expect(text).not.toMatch(/€|EUR/);
  });

  it('splits an address written on one line at the postcode', () => {
    expect(l.sender).toEqual(['Erika Muster', 'Hauptstraße 1', '91052 Erlangen']);
    expect(l.recipient).toEqual(['Musterkasse', 'Postfach 1', '90000 Nürnberg']);
  });

  it('is written in the first person when the person writes for themselves', () => {
    expect(text).toContain('Im Alltag bin ich');
    expect(text).not.toContain('Vollmacht');
  });
});

describe('details the person did not give', () => {
  it('leaves visible placeholders rather than inventing anything', () => {
    const l = buildLetter(input({ details: {} }));
    const text = letterText(l);
    expect(l.subject).toContain('[Datum des Bescheids]');
    expect(l.subject).toContain('[Versichertennummer]');
    expect(l.recipient).toEqual(['[Name und Anschrift der Pflegekasse]']);
    expect(text).toContain('[Ort], 01.10.2026');
  });
});

describe('writing on someone else’s behalf', () => {
  const l = buildLetter(
    input({
      details: {
        ...input().details,
        representative: { name: 'Sam Muster', address: 'Nebenweg 2\n91054 Erlangen' },
      },
    }),
  );
  const text = letterText(l);

  it('signs as the representative, names the person and encloses the authority', () => {
    expect(l.sender[0]).toBe('Sam Muster');
    expect(l.signature).toBe('Sam Muster');
    expect(text).toContain('in Vertretung von Erika Muster, geboren am 09.03.1941');
    expect(l.enclosures).toEqual(['Vollmacht']);
    expect(text).toContain('Im Alltag ist Erika Muster');
  });
});

describe('a range', () => {
  it('claims only its low end', () => {
    const text = letterText(buildLetter(input({ estimatedGrade: 3, atLeast: true })));
    expect(text).toContain('mindestens Pflegegrad 3');
  });
});

describe('the other two letters', () => {
  it('asks for a higher grade, naming the one held', () => {
    const l = buildLetter(input({ kind: 'antrag-hoeherstufung' }));
    expect(l.subject).toBe('Antrag auf Höherstufung des Pflegegrades, Versichertennummer A123456789');
    expect(letterText(l)).toContain('Derzeit ist Pflegegrad 2 anerkannt.');
    expect(letterText(l)).not.toContain('Bescheid vom');
  });

  it('applies from the date of the letter, and asks for care advice', () => {
    const l = buildLetter(input({ kind: 'antrag-pflegegrad', currentGrade: 0 }));
    const text = letterText(l);
    expect(l.subject).toContain('Antrag auf Leistungen der Pflegeversicherung');
    expect(text).toContain('ab dem Datum dieses Schreibens');
    expect(text).toContain('§ 7a SGB XI');
    expect(text).toContain('zu Hause');
  });

  it('names a care home where care is not at home', () => {
    const text = letterText(buildLetter(input({ kind: 'antrag-pflegegrad', atHome: false })));
    expect(text).toContain('in einer Pflegeeinrichtung');
  });
});

it('names the file after the letter', () => {
  expect(letterFileName('widerspruch-pflegegrad', '2026-10-01')).toBe(
    'widerspruch-pflegegrad-2026-10-01.pdf',
  );
});

it('renders a PDF with the letter in it', async () => {
  const doc = await renderLetterPdf(buildLetter(input()));
  expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  const bytes = doc.output('arraybuffer').byteLength;
  expect(bytes).toBeGreaterThan(1000);
});
