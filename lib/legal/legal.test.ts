import { describe, expect, it } from 'vitest';
import { BLANKS, type LegalSection } from './blanks';
import { DATENSCHUTZ, DATENSCHUTZ_TITLE } from './datenschutz';
import { IMPRESSUM, IMPRESSUM_TITLE } from './impressum';

const allText = (sections: readonly LegalSection[]): string[] =>
  sections.flatMap((s) => [s.de.heading, ...s.de.body, s.en.heading, ...s.en.body]);

const TEXTS = [
  ...allText(IMPRESSUM),
  ...allText(DATENSCHUTZ),
  IMPRESSUM_TITLE.de,
  IMPRESSUM_TITLE.en,
  DATENSCHUTZ_TITLE.de,
  DATENSCHUTZ_TITLE.en,
];

describe('legal texts', () => {
  it('gives every section a German and an English version', () => {
    for (const s of [...IMPRESSUM, ...DATENSCHUTZ]) {
      for (const lang of ['de', 'en'] as const) {
        expect(s[lang].heading.trim(), `${s.id}.${lang}`).not.toBe('');
        expect(s[lang].body.length, `${s.id}.${lang}`).toBeGreaterThan(0);
        for (const p of s[lang].body) expect(p.trim()).not.toBe('');
      }
      // Section by section: the English matches the German in shape.
      expect(s.en.body.length, s.id).toBe(s.de.body.length);
    }
  });

  it('uses exactly the blanks in BLANKS, and every one of them', () => {
    const found = new Set(TEXTS.flatMap((t) => t.match(/\[[^\]]*\]/g) ?? []));
    expect([...found].sort()).toEqual([...BLANKS].sort());
  });

  it('marks the optional Impressum items as "falls zutreffend"', () => {
    const optional = BLANKS.filter((b) => b.includes('falls zutreffend'));
    expect(optional.length).toBe(4);
    const impressum = allText(IMPRESSUM).join('\n');
    for (const b of optional) expect(impressum).toContain(b);
  });

  it('has no em-dash anywhere', () => {
    for (const t of TEXTS) expect(t).not.toContain(String.fromCharCode(0x2014));
  });

  // The ten items the Datenschutzerklärung must contain, in this order
  // (scout-compliance.md, final list). One keyword each, so that an edit
  // cannot silently drop one.
  const REQUIRED: Array<[string, RegExp]> = [
    ['controller', /Verantwortlich/],
    ['device storage', /localStorage/],
    ['PDF', /PDF/],
    ['hosting', /Vercel/],
    ['statistics', /Plausible/],
    ['partner links', /via/],
    ['fonts', /Schriftarten|fonts/],
    ['rights', /Rechte|rights/],
    ['no automated decision', /automatisierte Entscheidung/],
    ['health data', /Gesundheitsdaten/],
  ];

  it('contains the ten required items as ten sections, in order', () => {
    expect(DATENSCHUTZ.length).toBe(REQUIRED.length);
    REQUIRED.forEach(([name, keyword], i) => {
      const s = DATENSCHUTZ[i];
      const text = [s.de.heading, ...s.de.body, s.en.heading, ...s.en.body].join('\n');
      expect(text, `${i + 1}. ${name}`).toMatch(keyword);
    });
  });

  it('mentions the right to complain to the Aufsichtsbehörde', () => {
    expect(allText(DATENSCHUTZ).join('\n')).toMatch(/Aufsichtsbehörde/);
  });

  it('names the legal bases the scout names', () => {
    const de = (id: string) => DATENSCHUTZ.find((s) => s.id === id)!.de.body.join('\n');
    expect(de('geraet')).toContain('§ 25 Abs. 2 Nr. 2 TDDDG');
    expect(de('hosting')).toContain('Art. 6 Abs. 1 lit. f DSGVO');
    expect(de('hosting')).toContain('Data Privacy Framework');
    expect(de('hosting')).toContain('Standardvertragsklauseln');
    expect(de('statistik')).toContain('Art. 6 Abs. 1 lit. f DSGVO');
    expect(de('statistik')).toContain('Art. 21');
    expect(de('statistik')).toContain('nicht angegeben, siehe Datenschutzerklärung des Anbieters');
  });

  it('never claims that consent is not required', () => {
    const all = TEXTS.join('\n');
    expect(all).not.toMatch(/Einwilligung|consent/i);
  });
});
