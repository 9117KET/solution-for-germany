import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchSpokenAnswer, scriptText, spokenScript } from './speech';
import { DEFAULTS, TEXT_SCALE, TEXT_SIZES, THEMES, parseSettings } from './settings';
import { getSnapshot, resetStore, setSetting } from './store';
import { UI, translate, type UiKey } from '../i18n/strings';
import {
  LANGUAGES,
  LANG_IDS,
  hasContent,
  isRTL,
  languageMeta,
  lead,
  official,
  type ContentLang,
  type Lang,
} from '../i18n';
import { CONDITIONS, CRITERIA, SCALE_LABELS, TUBE_FEEDING_LABELS } from '../intake/criteria';
import { M5_CRITERIA } from '../intake/score';
import { PLAIN_CONDITIONS, PLAIN_CRITERIA, PLAIN_M5, PLAIN_SCALE } from '../intake/plain';
import {
  conditionLabel,
  criterionLabel,
  criterionOptions,
  m5Label,
} from '../intake/readable';

/** Every language the interface is written in. */
const CHROME_LANGS: readonly Lang[] = ['de', 'en', 'tr', 'ru', 'pl', 'ar'];
/** The languages the assessment content exists in. */
const CONTENT_LANGS: readonly ContentLang[] = ['de', 'en'];

describe('every string exists in every language', () => {
  it('has non-empty copy for each key in each language', () => {
    const missing: string[] = [];
    for (const [key, value] of Object.entries(UI)) {
      for (const lang of CHROME_LANGS) {
        if (!value[lang] || value[lang].trim() === '') missing.push(`${key}.${lang}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('uses the same placeholders in every language', () => {
    // A placeholder present in one language and absent in another shows the
    // person a literal "{amount}", or worse, silently drops the number. With
    // six languages this is the single easiest mistake to make, so every
    // language is compared against the German source rather than just to English.
    const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(',');
    const mismatched: string[] = [];
    for (const [key, value] of Object.entries(UI)) {
      const source = placeholders(value.de);
      for (const lang of CHROME_LANGS) {
        const got = placeholders(value[lang]);
        if (got !== source) mismatched.push(`${key}.${lang}: [${got}] vs de [${source}]`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('fills placeholders rather than leaving them in the output', () => {
    const out = translate('pointsToNext', 'de', { n: 7, grade: 2 });
    expect(out).toBe('7 Punkte fehlen bis Pflegegrad 2');
    expect(out).not.toContain('{');
  });

  it('leaves an unknown placeholder untouched rather than throwing', () => {
    // Better a visible oddity in one sentence than a blank screen.
    expect(translate('start', 'en', { unused: 1 })).toBe('Start');
  });

  it('offers exactly the languages the strings are written in', () => {
    expect(LANGUAGES.map((l) => l.id).sort()).toEqual([...CHROME_LANGS].sort());
    expect([...LANG_IDS].sort()).toEqual([...CHROME_LANGS].sort());
  });

  it('names every language in itself, so a speaker can find it', () => {
    for (const meta of LANGUAGES) {
      expect(meta.nativeName.trim()).toBeTruthy();
      expect(meta.bcp47).toMatch(/^[a-z]{2}-/);
      expect(meta.numberLocale.trim()).toBeTruthy();
    }
    expect(LANGUAGES.find((l) => l.id === 'tr')!.nativeName).toBe('Türkçe');
    expect(LANGUAGES.find((l) => l.id === 'ar')!.nativeName).toBe('العربية');
  });
});

describe('the starting language', () => {
  it('starts in German regardless of the browser', () => {
    // Not negotiable, and deliberately not taken from navigator.languages.
    // This is a German entitlement, claimed from a German insurer on German
    // forms. A carer whose laptop is set to English is still filling in German
    // paperwork, and starting them in English would hide the terminology they
    // are about to meet. The language control is on the very first screen.
    expect(DEFAULTS.lang).toBe('de');
    expect(DEFAULTS.contentLang).toBe('de');
  });

  it('does not consult the browser language anywhere', () => {
    const source = readFileSync(join(__dirname, 'settings.ts'), 'utf8');
    expect(source).not.toContain('navigator.language');
    expect(source).not.toContain('detectLang');
  });

  it('keeps German as the starting point for every stored file that omits it', () => {
    expect(parseSettings({ textSize: 'largest' }).lang).toBe('de');
    expect(parseSettings({}).lang).toBe('de');
  });
});

describe('the boundary between interface and content', () => {
  it('has content in German and English only', () => {
    expect(CHROME_LANGS.filter(hasContent).sort()).toEqual([...CONTENT_LANGS].sort());
    for (const lang of ['tr', 'ru', 'pl', 'ar'] as Lang[]) {
      expect(hasContent(lang)).toBe(false);
    }
  });

  it('leaves the questions in German when an interface-only language is chosen', () => {
    // The four interface-only languages have no content to move the questions
    // to, so choosing one must not disturb the content language. Choosing
    // German or English does move it, because being handed a German interface
    // with English questions would be baffling.
    resetStore();
    setSetting('lang', 'tr');
    expect(getSnapshot().contentLang).toBe('de');
    setSetting('lang', 'ar');
    expect(getSnapshot().contentLang).toBe('de');

    setSetting('lang', 'en');
    expect(getSnapshot().contentLang).toBe('en');

    // ...and an English content choice survives a switch to a Turkish interface.
    setSetting('lang', 'ru');
    expect(getSnapshot().contentLang).toBe('en');

    setSetting('lang', 'de');
    expect(getSnapshot().contentLang).toBe('de');
    resetStore();
  });

  it('marks Arabic as right-to-left and nothing else', () => {
    expect(isRTL('ar')).toBe(true);
    for (const lang of ['de', 'en', 'tr', 'ru', 'pl'] as Lang[]) {
      expect(isRTL(lang)).toBe(false);
    }
    expect(languageMeta('ar').dir).toBe('rtl');
  });

  it('formats Arabic money in Latin digits', () => {
    // Someone reading ٤٦٧٫٩٢ and then filling in a German form that says
    // 467,92 has been given extra work, not less.
    const formatted = new Intl.NumberFormat(languageMeta('ar').numberLocale, {
      style: 'currency',
      currency: 'EUR',
    }).format(467.92);
    expect(formatted).toMatch(/467/);
    expect(formatted).not.toMatch(/[٠-٩]/);
  });

  it('formats money sensibly in every interface language', () => {
    for (const meta of LANGUAGES) {
      const out = new Intl.NumberFormat(meta.numberLocale, {
        style: 'currency',
        currency: 'EUR',
      }).format(1234.5);
      // Whatever the separators, the digits have to survive.
      expect(out.replace(/\D/g, ''), meta.id).toContain('12345');
    }
  });

  it('writes an interpolated score with the reader’s decimal separator', () => {
    // The weighted module scores step in 1.25s, so a fractional total is the
    // ordinary case rather than an edge one: this is the headline figure on
    // the report. `String(47.5)` gives "47.5" in every language, which is
    // wrong in four of the six.
    expect(translate('pointsOf100', 'de', { n: 47.5 })).toContain('47,5');
    expect(translate('pointsOf100', 'tr', { n: 47.5 })).toContain('47,5');
    expect(translate('pointsOf100', 'ru', { n: 47.5 })).toContain('47,5');
    expect(translate('pointsOf100', 'pl', { n: 47.5 })).toContain('47,5');
    expect(translate('pointsOf100', 'en', { n: 47.5 })).toContain('47.5');
  });

  it('keeps interpolated numbers in Latin digits in Arabic', () => {
    // Same reasoning as the money case: the figure gets copied onto a German
    // form, so Eastern Arabic numerals would make more work, not less.
    const out = translate('pointsOf100', 'ar', { n: 47.5 });
    expect(out).toMatch(/47/);
    expect(out).not.toMatch(/[٠-٩]/);
  });

  it('leaves whole numbers unpunctuated in every language', () => {
    // Question counters run through the same path. "Frage 1 von 63" must not
    // pick up a grouping separator or a stray decimal.
    for (const meta of LANGUAGES) {
      expect(translate('pointsOf100', meta.id, { n: 100 }), meta.id).toContain('100');
    }
  });
});

describe('plain wording covers every question', () => {
  it('has an everyday rendering for every scored criterion', () => {
    const missing = CRITERIA.filter((c) => !PLAIN_CRITERIA[c.id]).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('has an everyday rendering for every module 5 row', () => {
    const missing = M5_CRITERIA.filter((c) => !PLAIN_M5[c.id]).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it('has an everyday rendering for every gating question', () => {
    for (const id of Object.keys(CONDITIONS) as Array<keyof typeof CONDITIONS>) {
      expect(PLAIN_CONDITIONS[id]).toBeDefined();
    }
  });

  it('gives every scale exactly as many plain options as official ones', () => {
    // One short, and the last option would silently fall back to official
    // wording in the middle of an otherwise plain list.
    expect(PLAIN_SCALE.independence).toHaveLength(SCALE_LABELS.independence.length);
    expect(PLAIN_SCALE.ability).toHaveLength(SCALE_LABELS.ability.length);
    expect(PLAIN_SCALE.frequency).toHaveLength(SCALE_LABELS.frequency.length);
    expect(PLAIN_SCALE.tubeFeeding).toHaveLength(TUBE_FEEDING_LABELS.length);
  });

  it('never leaves a plain string blank in either language', () => {
    const registries = [PLAIN_CRITERIA, PLAIN_M5, PLAIN_CONDITIONS];
    for (const reg of registries) {
      for (const [id, value] of Object.entries(reg)) {
        for (const lang of CONTENT_LANGS) {
          expect(value[lang]?.trim(), `${id}.${lang}`).toBeTruthy();
        }
      }
    }
    for (const options of Object.values(PLAIN_SCALE)) {
      for (const o of options) {
        for (const lang of CONTENT_LANGS) expect(o[lang]?.trim()).toBeTruthy();
      }
    }
  });
});

describe('choosing which wording to lead with', () => {
  const criterion = CRITERIA.find((c) => c.id === '4.7')!;

  it('leads with everyday wording and keeps the official wording underneath', () => {
    const label = criterionLabel(criterion);
    expect(lead(label, 'de', true)).toBe('Essen klein schneiden und Getränke eingießen');
    expect(official(label, 'de', true)).toBe(
      'Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken',
    );
  });

  it('shows only the official wording when plain words are off', () => {
    const label = criterionLabel(criterion);
    expect(lead(label, 'de', false)).toBe(
      'Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken',
    );
    // Nothing to put underneath, because the lead is already the official text.
    expect(official(label, 'de', false)).toBeNull();
  });

  it('falls back to the official wording where no plain version exists', () => {
    const invented = { de: 'Amtlich', en: 'Official' };
    expect(lead(invented, 'de', true)).toBe('Amtlich');
    expect(official(invented, 'de', true)).toBeNull();
  });

  it('pairs every criterion and module 5 row with usable options', () => {
    for (const c of CRITERIA) {
      const options = criterionOptions(c);
      expect(options.length).toBe(c.points.length);
      for (const o of options) expect(lead(o, 'de', true)).toBeTruthy();
      expect(lead(criterionLabel(c), 'de', true)).toBeTruthy();
    }
    for (const c of M5_CRITERIA) expect(lead(m5Label(c), 'de', true)).toBeTruthy();
    for (const id of Object.keys(CONDITIONS) as Array<keyof typeof CONDITIONS>) {
      expect(lead(conditionLabel(id), 'de', true)).toBeTruthy();
    }
  });
});

describe('understanding a spoken answer', () => {
  const four = ['Schafft sie allein', 'Schafft sie fast allein', 'Braucht viel Hilfe', 'Schafft sie nicht allein'];
  const en = ['Manages alone', 'Manages almost alone', 'Needs a lot of help', 'Cannot do it alone'];

  it.each([
    ['eins', 0],
    ['zwei', 1],
    ['drei', 2],
    ['vier', 3],
    ['nummer drei', 2],
    ['ich sage zwei', 1],
    ['3', 2],
  ])('German "%s" picks option %i', (said, index) => {
    expect(matchSpokenAnswer(said, four, 'de')).toEqual({ kind: 'option', index });
  });

  it.each([
    ['one', 0],
    ['two', 1],
    ['number four', 3],
    ['4', 3],
  ])('English "%s" picks option %i', (said, index) => {
    expect(matchSpokenAnswer(said, en, 'en')).toEqual({ kind: 'option', index });
  });

  it('recognises the commands in both languages', () => {
    expect(matchSpokenAnswer('weiter', four, 'de')).toEqual({ kind: 'next' });
    expect(matchSpokenAnswer('zurück', four, 'de')).toEqual({ kind: 'back' });
    expect(matchSpokenAnswer('wiederholen', four, 'de')).toEqual({ kind: 'repeat' });
    expect(matchSpokenAnswer('next', en, 'en')).toEqual({ kind: 'next' });
    expect(matchSpokenAnswer('go back', en, 'en')).toEqual({ kind: 'back' });
    expect(matchSpokenAnswer('say again', en, 'en')).toEqual({ kind: 'repeat' });
  });

  it('prefers a command over a fuzzy match on an option', () => {
    // "zurück" must never be read as an attempt at one of the answers.
    expect(matchSpokenAnswer('zurück bitte', four, 'de')).toEqual({ kind: 'back' });
  });

  it('matches an option read out in full', () => {
    expect(matchSpokenAnswer('Braucht viel Hilfe', four, 'de')).toEqual({
      kind: 'option',
      index: 2,
    });
  });

  it('refuses to guess between options that share their wording', () => {
    // "allein" appears in three of the four options. Recording a wrong answer
    // about someone's care is worse than asking them to say it again.
    expect(matchSpokenAnswer('allein', four, 'de')).toEqual({ kind: 'none' });
  });

  it('returns none for silence or noise', () => {
    expect(matchSpokenAnswer('', four, 'de')).toEqual({ kind: 'none' });
    expect(matchSpokenAnswer('   ', four, 'de')).toEqual({ kind: 'none' });
    expect(matchSpokenAnswer('hmm ähm tja', four, 'de')).toEqual({ kind: 'none' });
  });

  it('ignores punctuation and casing the recogniser adds', () => {
    expect(matchSpokenAnswer('Zwei.', four, 'de')).toEqual({ kind: 'option', index: 1 });
    expect(matchSpokenAnswer('  DREI!  ', four, 'de')).toEqual({ kind: 'option', index: 2 });
  });

  it('never offers an option index beyond the options given', () => {
    // The tube-feeding scale has three options, so "four" is not an answer.
    const three = ['a', 'b', 'c'];
    expect(matchSpokenAnswer('vier', three, 'de')).toEqual({ kind: 'none' });
  });

  it('does not match a number word buried inside another word', () => {
    // "meins" contains "eins"; whole-word matching keeps it out.
    expect(matchSpokenAnswer('meins', four, 'de')).toEqual({ kind: 'none' });
  });
});

describe('the sentence read aloud', () => {
  it('numbers the options, because the number is what is asked for', () => {
    const text = scriptText(
      spokenScript('Selbst essen', ['Allein', 'Fast allein', 'Nicht allein'], 'de', 'de'),
    );
    expect(text).toContain('1: Allein');
    expect(text).toContain('2: Fast allein');
    expect(text).toContain('3: Nicht allein');
    expect(text).toContain('Sagen Sie die Nummer');
  });

  it('includes the hint when there is one', () => {
    const text = scriptText(spokenScript('Essen', ['a'], 'en', 'en', 'Bringing food to the mouth'));
    expect(text).toContain('Bringing food to the mouth');
  });

  it('speaks as one segment when question and interface share a language', () => {
    const segments = spokenScript('Selbst essen', ['Allein'], 'de', 'de');
    expect(segments).toHaveLength(1);
    expect(segments[0].lang).toBe('de');
  });

  it('splits the script so each language is spoken in its own voice', () => {
    // A Turkish interface with German questions: reading the German with a
    // Turkish voice is not accented, it is unintelligible. The question keeps
    // its own language and only the closing instruction is Turkish.
    const segments = spokenScript('Selbst essen', ['Schafft sie allein'], 'de', 'tr');
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ lang: 'de' });
    expect(segments[0].text).toContain('Selbst essen');
    expect(segments[0].text).toContain('Schafft sie allein');
    expect(segments[1]).toMatchObject({ lang: 'tr' });
    expect(segments[1].text).toContain('numarasını');
    // The German half must not carry any Turkish, and vice versa.
    expect(segments[0].text).not.toContain('numarasını');
    expect(segments[1].text).not.toContain('Selbst essen');
  });

  it.each(['tr', 'ru', 'pl', 'ar'] as Lang[])(
    'asks for the number in %s while keeping the question German',
    (chromeLang) => {
      const segments = spokenScript('Selbst essen', ['Allein'], 'de', chromeLang);
      expect(segments).toHaveLength(2);
      expect(segments[0].lang).toBe('de');
      expect(segments[1].lang).toBe(chromeLang);
      expect(segments[1].text.trim()).toBeTruthy();
    },
  );

  it('never leaves a segment without text to say', () => {
    for (const contentLang of CONTENT_LANGS) {
      for (const chromeLang of CHROME_LANGS) {
        const segments = spokenScript('Frage', ['a', 'b'], contentLang, chromeLang);
        for (const seg of segments) expect(seg.text.trim(), `${contentLang}/${chromeLang}`).toBeTruthy();
      }
    }
  });
});

describe('settings survive bad stored data', () => {
  it('accepts every interface language and rejects anything else', () => {
    for (const lang of CHROME_LANGS) expect(parseSettings({ lang }).lang).toBe(lang);
    expect(parseSettings({ lang: 'klingon' }).lang).toBe(DEFAULTS.lang);
    // Content language is a narrower set: an interface-only language here
    // would leave the questions with nowhere to come from.
    for (const lang of CONTENT_LANGS) {
      expect(parseSettings({ contentLang: lang }).contentLang).toBe(lang);
    }
    expect(parseSettings({ contentLang: 'tr' }).contentLang).toBe(DEFAULTS.contentLang);
  });

  it('falls back per field rather than discarding everything', () => {
    const parsed = parseSettings({
      lang: 'klingon',
      textSize: 'largest',
      theme: 'chartreuse',
      plainWords: 'yes',
      pace: 'one',
    });
    // The two valid fields are kept; the invalid ones fall back.
    expect(parsed.textSize).toBe('largest');
    expect(parsed.pace).toBe('one');
    expect(parsed.lang).toBe(DEFAULTS.lang);
    expect(parsed.theme).toBe(DEFAULTS.theme);
    expect(parsed.plainWords).toBe(DEFAULTS.plainWords);
  });

  it.each([null, undefined, 42, 'nonsense', []])('yields defaults for %s', (raw) => {
    expect(parseSettings(raw)).toEqual(DEFAULTS);
  });

  it('accepts every value it advertises', () => {
    for (const textSize of TEXT_SIZES) {
      expect(parseSettings({ textSize }).textSize).toBe(textSize);
    }
    for (const theme of THEMES) {
      expect(parseSettings({ theme }).theme).toBe(theme);
    }
  });

  it('defaults to settings that suit the audience rather than the developer', () => {
    // Large text and one question per page cost a confident user a little
    // scrolling; the reverse defaults cost the intended audience the product.
    expect(DEFAULTS.textSize).toBe('large');
    expect(DEFAULTS.pace).toBe('one');
    expect(DEFAULTS.plainWords).toBe(true);
    expect(DEFAULTS.lang).toBe('de');
  });
});

describe('the pre-paint script stays in step with the settings module', () => {
  // `app/layout.tsx` inlines a copy of the scale table so stored settings apply
  // before the first paint. Duplication is the right call there, but it has to
  // be a duplicate that cannot drift.
  const layout = readFileSync(join(__dirname, '..', '..', 'app', 'layout.tsx'), 'utf8');

  it('inlines the same scale values', () => {
    const table = layout.match(/var scale = \{([^}]+)\}/)?.[1];
    expect(table, 'scale table not found in layout.tsx').toBeTruthy();
    const inlined = Object.fromEntries(
      table!.split(',').map((pair) => {
        const [k, v] = pair.split(':').map((x) => x.trim());
        return [k, Number(v)];
      }),
    );
    expect(inlined).toEqual(TEXT_SCALE);
  });

  it('inlines the same storage key', () => {
    expect(layout).toContain('anspruch.settings.v1');
  });

  it('inlines the same default text size', () => {
    // The `|| 1.25` fallback has to equal the default, or the first paint uses
    // one size and the hydrated app another.
    const fallback = layout.match(/scale\[s\.textSize\] \|\| ([\d.]+)/)?.[1];
    expect(Number(fallback)).toBe(TEXT_SCALE[DEFAULTS.textSize]);
  });
});

describe('key coverage', () => {
  it('translates every key without throwing in either language', () => {
    for (const key of Object.keys(UI) as UiKey[]) {
      for (const lang of CHROME_LANGS) expect(() => translate(key, lang)).not.toThrow();
    }
  });
});
