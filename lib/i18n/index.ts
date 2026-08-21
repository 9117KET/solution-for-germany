/**
 * Language, reading register, and writing direction.
 *
 * There are two distinct layers of text here, and conflating them would be a
 * lie to the user:
 *
 *  - **Chrome**: buttons, navigation, headings, explanations. Written in all
 *    six languages. This is what `ChromeText` and `translate()` handle.
 *
 *  - **Content**: the assessment criteria, the benefit catalogue, the
 *    statutory caveats. German and English only. These are transcriptions of a
 *    legal instrument and statements about money someone is entitled to; a
 *    translation that has not been checked by a native speaker who knows the
 *    subject would be worse than no translation at all, because it would be
 *    believed. This is what `Localised` and `pick()` handle.
 *
 * The four languages beyond German and English were chosen because they are
 * the largest first languages among family carers in Germany. Someone using the
 * Turkish interface still meets German questions, and the interface says so
 * plainly rather than letting them discover it halfway through.
 *
 * `plain` is a reading register, not a language: everyday wording in place of
 * the official terminology, following the rules German plain language sets out.
 * The official wording is never thrown away: it stays underneath in small
 * type, because that is what the assessor will say.
 */

/** Every language the interface is written in. */
export type Lang = 'de' | 'en' | 'tr' | 'ru' | 'pl' | 'ar';

/** The languages the assessment content itself exists in. */
export type ContentLang = 'de' | 'en';

export interface LanguageMeta {
  id: Lang;
  /** The language's name in itself, the only name a speaker reliably knows. */
  nativeName: string;
  englishName: string;
  bcp47: string;
  dir: 'ltr' | 'rtl';
  /**
   * Locale for formatting money and numbers.
   *
   * Arabic is pinned to Latin digits. Someone reading `٤٦٧٫٩٢` then filling in
   * a German form that says `467,92` has been given extra work, not less.
   */
  numberLocale: string;
}

export const LANGUAGES: readonly LanguageMeta[] = [
  {
    id: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    bcp47: 'de-DE',
    dir: 'ltr',
    numberLocale: 'de-DE',
  },
  {
    id: 'en',
    nativeName: 'English',
    englishName: 'English',
    bcp47: 'en-GB',
    dir: 'ltr',
    numberLocale: 'en-IE',
  },
  {
    id: 'tr',
    nativeName: 'Türkçe',
    englishName: 'Turkish',
    bcp47: 'tr-TR',
    dir: 'ltr',
    numberLocale: 'tr-TR',
  },
  {
    id: 'ru',
    nativeName: 'Русский',
    englishName: 'Russian',
    bcp47: 'ru-RU',
    dir: 'ltr',
    numberLocale: 'ru-RU',
  },
  {
    id: 'pl',
    nativeName: 'Polski',
    englishName: 'Polish',
    bcp47: 'pl-PL',
    dir: 'ltr',
    numberLocale: 'pl-PL',
  },
  {
    id: 'ar',
    nativeName: 'العربية',
    englishName: 'Arabic',
    bcp47: 'ar-SA',
    dir: 'rtl',
    numberLocale: 'ar-EG-u-nu-latn',
  },
];

export const LANG_IDS: readonly Lang[] = LANGUAGES.map((l) => l.id);

const BY_ID: Record<Lang, LanguageMeta> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l]),
) as Record<Lang, LanguageMeta>;

export function languageMeta(lang: Lang): LanguageMeta {
  return BY_ID[lang];
}

export function isRTL(lang: Lang): boolean {
  return BY_ID[lang].dir === 'rtl';
}

/** BCP 47 tag, for `lang` attributes and the speech engines. */
export function bcp47(lang: Lang): string {
  return BY_ID[lang].bcp47;
}

/** Whether the assessment content exists in this language at all. */
export function hasContent(lang: Lang): lang is ContentLang {
  return lang === 'de' || lang === 'en';
}

// ------------------------------------------------------------------- chrome

/** Interface copy. Every language, always: a gap here is a compile error. */
export type ChromeText = Record<Lang, string>;

// ------------------------------------------------------------------ content

/** Assessment content. German and English only, by deliberate choice. */
export interface Localised {
  de: string;
  en: string;
}

/**
 * A label that additionally carries a plain-language rendering. Where `easy`
 * is absent the official wording is already plain enough to stand alone.
 */
export interface Readable extends Localised {
  easy?: Localised;
}

export function pick(s: Localised, lang: ContentLang): string {
  return s[lang];
}

/**
 * The wording to lead with. In plain mode the everyday phrasing wins where one
 * exists; otherwise the official wording is used unchanged.
 */
export function lead(s: Readable, lang: ContentLang, plain: boolean): string {
  return plain && s.easy ? s.easy[lang] : s[lang];
}

/**
 * The official wording, but only when it is worth showing as a second line,
 * that is, when plain mode is on and it actually differs from the lead.
 */
export function official(s: Readable, lang: ContentLang, plain: boolean): string | null {
  return plain && s.easy ? s[lang] : null;
}
