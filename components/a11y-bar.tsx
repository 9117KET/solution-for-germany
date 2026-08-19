'use client';

import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, hasContent } from '@/lib/i18n';
import { TEXT_SIZES, THEMES, type TextSize, type Theme } from '@/lib/a11y/settings';
import { useSettings, useT } from './settings';
import type { UiKey } from '@/lib/i18n/strings';

const SIZE_KEY: Record<TextSize, UiKey> = {
  normal: 'sizeNormal',
  large: 'sizeLarge',
  larger: 'sizeLarger',
  largest: 'sizeLargest',
};

const THEME_KEY: Record<Theme, UiKey> = {
  light: 'themeLight',
  dark: 'themeDark',
  'contrast-light': 'themeContrastLight',
  'contrast-dark': 'themeContrastDark',
};

/** Swatch showing what a theme actually looks like, so the label is not the only cue. */
const THEME_SWATCH: Record<Theme, { bg: string; fg: string }> = {
  light: { bg: '#ffffff', fg: '#131b1e' },
  dark: { bg: '#161f23', fg: '#e6edee' },
  'contrast-light': { bg: '#ffffff', fg: '#000000' },
  'contrast-dark': { bg: '#000000', fg: '#ffe700' },
};

/**
 * The always-present display bar.
 *
 * Two things are deliberate here. First, text size sits directly in the bar
 * rather than inside the panel: it is the control people need most and the one
 * they need before they can comfortably read anything else, including the panel
 * that would otherwise contain it. Second, nothing is icon-only — every control
 * carries a word, because an unlabelled glyph is a guess.
 */
export function A11yBar() {
  const { settings, set } = useSettings();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const sizeIndex = TEXT_SIZES.indexOf(settings.textSize);
  const smaller = TEXT_SIZES[Math.max(0, sizeIndex - 1)];
  const bigger = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, sizeIndex + 1)];

  // Escape closes the panel and returns focus to the button that opened it —
  // otherwise keyboard users are dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="no-print sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="mr-auto text-sm font-semibold tracking-tight">Anspruch</span>

        <div className="flex items-center gap-1" role="group" aria-label={t('textSize')}>
          <button
            type="button"
            onClick={() => set('textSize', smaller)}
            disabled={sizeIndex === 0}
            aria-label={t('textSizeSmaller')}
            className="target bordered rounded-md px-3 text-sm font-semibold disabled:opacity-40"
          >
            A<span aria-hidden="true" className="text-xs">−</span>
          </button>
          <button
            type="button"
            onClick={() => set('textSize', bigger)}
            disabled={sizeIndex === TEXT_SIZES.length - 1}
            aria-label={t('textSizeBigger')}
            className="target bordered rounded-md px-3 text-base font-semibold disabled:opacity-40"
          >
            A<span aria-hidden="true" className="text-xs">+</span>
          </button>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="display-panel"
          className="target bordered rounded-md px-3 text-sm font-semibold"
        >
          {open ? t('settingsClose') : t('settingsOpen')}
        </button>
      </div>

      {open ? (
        <div
          id="display-panel"
          ref={panelRef}
          className="border-t border-line bg-surface-2"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5">
            <Group label={t('language')}>
              {LANGUAGES.map((l) => (
                <Pill
                  key={l.id}
                  active={settings.lang === l.id}
                  onClick={() => set('lang', l.id)}
                  lang={l.id}
                >
                  {l.nativeName}
                </Pill>
              ))}
            </Group>

            {!hasContent(settings.lang) ? (
              <Group label={t('contentLanguage')} hint={t('contentNoticeBody')}>
                {LANGUAGES.filter((l) => hasContent(l.id)).map((l) => (
                  <Pill
                    key={l.id}
                    active={settings.contentLang === l.id}
                    onClick={() => set('contentLang', l.id as 'de' | 'en')}
                    lang={l.id}
                  >
                    {l.nativeName}
                  </Pill>
                ))}
              </Group>
            ) : null}

            <Group label={t('textSize')}>
              {TEXT_SIZES.map((s) => (
                <Pill key={s} active={settings.textSize === s} onClick={() => set('textSize', s)}>
                  {t(SIZE_KEY[s])}
                </Pill>
              ))}
            </Group>

            <Group label={t('colours')}>
              {THEMES.map((th) => (
                <Pill key={th} active={settings.theme === th} onClick={() => set('theme', th)}>
                  <span
                    aria-hidden="true"
                    className="me-2 inline-block rounded border border-line px-1.5 text-xs font-bold"
                    style={{
                      background: THEME_SWATCH[th].bg,
                      color: THEME_SWATCH[th].fg,
                    }}
                  >
                    Aa
                  </span>
                  {t(THEME_KEY[th])}
                </Pill>
              ))}
            </Group>

            <Group label={t('plainWords')} hint={t('plainWordsHint')}>
              <Pill active={settings.plainWords} onClick={() => set('plainWords', true)}>
                {t('plainWordsOn')}
              </Pill>
              <Pill active={!settings.plainWords} onClick={() => set('plainWords', false)}>
                {t('plainWordsOff')}
              </Pill>
            </Group>

            <Group label={t('pace')}>
              <Pill active={settings.pace === 'one'} onClick={() => set('pace', 'one')}>
                {t('paceOne')}
              </Pill>
              <Pill active={settings.pace === 'list'} onClick={() => set('pace', 'list')}>
                {t('paceList')}
              </Pill>
            </Group>

            <Group label={t('answerMode')}>
              <Pill
                active={settings.answerMode === 'tap'}
                onClick={() => set('answerMode', 'tap')}
              >
                {t('answerByTap')}
              </Pill>
              <Pill
                active={settings.answerMode === 'voice'}
                onClick={() => set('answerMode', 'voice')}
              >
                {t('answerByVoice')}
              </Pill>
            </Group>

            <Group label={t('readAloud')}>
              <Pill active={settings.autoRead} onClick={() => set('autoRead', true)}>
                {t('plainWordsOn')}
              </Pill>
              <Pill active={!settings.autoRead} onClick={() => set('autoRead', false)}>
                {t('plainWordsOff')}
              </Pill>
            </Group>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">{label}</legend>
      {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Pill({
  active,
  onClick,
  children,
  lang,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  lang?: string;
}) {
  return (
    <button
      type="button"
      lang={lang}
      // A language endonym must survive browser translation intact.
      translate={lang ? 'no' : undefined}
      aria-pressed={active}
      onClick={onClick}
      className={`target bordered rounded-md px-4 py-2 text-start text-sm font-medium ${
        active ? 'border-accent-line bg-accent text-accent-fg font-semibold' : 'bg-surface'
      }`}
    >
      {children}
    </button>
  );
}
