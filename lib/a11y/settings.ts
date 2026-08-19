/**
 * Display and interaction settings.
 *
 * These are the settings that decide whether someone can use this at all, so
 * they are treated as part of the product rather than as a preferences page
 * hidden behind a gear icon. Three rules follow from that:
 *
 *  1. They are offered up front, on the first screen, in the words of the
 *     person choosing — "Bigger text", not "Font scale 1.5".
 *  2. They stay reachable from every screen afterwards, because someone only
 *     discovers the text is too small once they meet a real question.
 *  3. They survive a reload. Setting them again every visit is exactly the
 *     kind of friction that makes people give up.
 *
 * Nothing here is sent anywhere. It lives in this browser's localStorage.
 */

import { LANG_IDS, languageMeta, type ContentLang, type Lang } from '../i18n';

/** Text size, as multiples of the browser's own base size. */
export type TextSize = 'normal' | 'large' | 'larger' | 'largest';

export const TEXT_SCALE: Record<TextSize, number> = {
  normal: 1,
  large: 1.25,
  larger: 1.5,
  largest: 1.9,
};

export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'larger', 'largest'];

/**
 * Colour scheme.
 *
 * The two `contrast` schemes are not just "dark mode" again: they drop every
 * mid-tone, thicken every border and push contrast past the WCAG AAA ratio of
 * 7:1. Yellow on black is the combination long-standing sight-loss guidance
 * settles on, and people who need it know to ask for it by name.
 */
export type Theme = 'light' | 'dark' | 'contrast-light' | 'contrast-dark';

export const THEMES: readonly Theme[] = ['light', 'dark', 'contrast-light', 'contrast-dark'];

/** How the person wants to give their answers. */
export type AnswerMode = 'tap' | 'voice';

/** How much is put in front of them at once. */
export type Pace = 'one' | 'list';

export interface Settings {
  /** The language of the interface. All six are fully written. */
  lang: Lang;
  /**
   * The language the assessment questions themselves are shown in.
   *
   * Kept separate from `lang` because the content exists only in German and
   * English. Someone reading the Turkish interface still has to be told which
   * of the two the questions will be in, and still has to be able to change it.
   */
  contentLang: ContentLang;
  textSize: TextSize;
  theme: Theme;
  /** Use everyday wording in place of the official terminology. */
  plainWords: boolean;
  answerMode: AnswerMode;
  pace: Pace;
  /** Read each question aloud as it appears, without being asked each time. */
  autoRead: boolean;
}

/**
 * Defaults deliberately lean towards the person who needs the most help.
 *
 * `large` text and one question per page cost a confident user a couple of
 * scrolls. The reverse default costs someone with poor near vision the whole
 * product. Plain words are on for the same reason: the official terminology is
 * still shown, just not first.
 */
export const DEFAULTS: Settings = {
  lang: 'de',
  contentLang: 'de',
  textSize: 'large',
  theme: 'light',
  plainWords: true,
  answerMode: 'tap',
  pace: 'one',
  autoRead: false,
};

const STORAGE_KEY = 'anspruch.settings.v1';

/**
 * Validate an unknown value into settings, field by field.
 *
 * Anything unrecognised falls back to its default rather than rejecting the
 * whole object, so one stale field from an older version cannot wipe someone's
 * other choices.
 */
export function parseSettings(raw: unknown): Settings {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  const bool = (v: unknown, fallback: boolean): boolean =>
    typeof v === 'boolean' ? v : fallback;

  return {
    lang: oneOf<Lang>(o.lang, LANG_IDS, DEFAULTS.lang),
    contentLang: oneOf<ContentLang>(o.contentLang, ['de', 'en'], DEFAULTS.contentLang),
    textSize: oneOf<TextSize>(o.textSize, TEXT_SIZES, DEFAULTS.textSize),
    theme: oneOf<Theme>(o.theme, THEMES, DEFAULTS.theme),
    plainWords: bool(o.plainWords, DEFAULTS.plainWords),
    answerMode: oneOf<AnswerMode>(o.answerMode, ['tap', 'voice'], DEFAULTS.answerMode),
    pace: oneOf<Pace>(o.pace, ['one', 'list'], DEFAULTS.pace),
    autoRead: bool(o.autoRead, DEFAULTS.autoRead),
  };
}

/** Read stored settings, falling back to defaults seeded from the environment. */
export function loadSettings(): Settings {
  const seeded: Settings = { ...DEFAULTS };
  if (typeof window === 'undefined') return seeded;

  // The language is deliberately NOT taken from the browser. This is a German
  // entitlement, claimed from a German insurer on German forms, so German is
  // where everyone starts — including a carer whose laptop happens to be set to
  // English. The language control sits on the first screen and in the bar on
  // every screen after it, so changing it costs one tap.
  //
  // Contrast and text size are different: someone who has told their operating
  // system they need large text or high contrast has already answered that
  // question once, and making them answer it again is exactly the friction this
  // product exists to remove.
  const media = (q: string) => window.matchMedia?.(q).matches === true;
  if (media('(prefers-contrast: more)')) seeded.theme = 'contrast-light';
  else if (media('(prefers-color-scheme: dark)')) seeded.theme = 'dark';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return seeded;
    const raw = JSON.parse(stored) as Record<string, unknown>;
    const parsed = parseSettings(raw);

    // Settings written before the language became unconditionally German were
    // seeded from the browser, so a machine set to English has "en" stored from
    // a choice nobody made. Those files are recognisable by having no
    // `contentLang` field. Drop the language from them and keep the rest — text
    // size and contrast were still deliberate choices worth preserving.
    if (typeof raw.contentLang !== 'string') {
      parsed.lang = DEFAULTS.lang;
      parsed.contentLang = DEFAULTS.contentLang;
    }
    return { ...seeded, ...parsed };
  } catch {
    // A blocked or full localStorage must not stop the product working.
    return seeded;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private browsing, quota, a locked-down device: none of it is fatal. The
    // settings simply do not outlive the tab.
  }
}

/**
 * Push settings onto the document element.
 *
 * The text scale is applied as a root font size so that everything measured in
 * `rem` — type, padding, gaps, tap targets — grows together. Scaling only the
 * type would leave large text crammed into small buttons.
 */
export function applySettings(s: Settings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(TEXT_SCALE[s.textSize]));
  root.dataset.theme = s.theme;
  root.lang = s.lang;
  // Arabic reverses the whole layout. Setting `dir` on the root is what makes
  // the logical CSS properties used throughout flip in the right direction.
  root.dir = languageMeta(s.lang).dir;
  // Lets CSS react to the schemes that need thicker borders and no shadows.
  root.dataset.contrast = s.theme.startsWith('contrast') ? 'high' : 'normal';
}
