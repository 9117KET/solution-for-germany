'use client';

import { LANGUAGES, hasContent } from '@/lib/i18n';
import { TEXT_SIZES, THEMES, type TextSize, type Theme } from '@/lib/a11y/settings';
import { canListen, canSpeak } from '@/lib/a11y/speech';
import { useClientFlag, useSettings, useT } from './settings';
import { Button, Notice } from './ui';
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

const THEME_SWATCH: Record<Theme, { bg: string; fg: string; line: string }> = {
  light: { bg: '#ffffff', fg: '#131b1e', line: '#c4d0d3' },
  dark: { bg: '#161f23', fg: '#e6edee', line: '#2c3b41' },
  'contrast-light': { bg: '#ffffff', fg: '#000000', line: '#000000' },
  'contrast-dark': { bg: '#000000', fg: '#ffe700', line: '#ffe700' },
};

/**
 * The first screen, which is a setup screen as much as a welcome.
 *
 * Putting text size, colours and language in front of someone *before* the
 * questions is the whole point. A settings panel tucked away in a corner is
 * found by people who already know to look for it; the people who most need
 * larger text are the least likely to go hunting. Asking once, in plain words,
 * with the change visible immediately, costs a confident user four seconds.
 *
 * Choices are applied live rather than on submit, so the screen itself is the
 * preview: a size control that only takes effect on the next page is a control
 * you cannot judge.
 */
export function Welcome({ onStart }: { onStart: () => void }) {
  const { settings, set } = useSettings();
  const { t } = useT();

  // Capabilities are unknowable on the server, so both read as false through
  // hydration and truthfully straight afterwards.
  const canUseVoice = useClientFlag(canListen);
  const canReadAloud = useClientFlag(canSpeak);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {t('welcomeEyebrow')}
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {t('welcomeTitle')}
        </h1>
        <p className="max-w-prose text-xl text-fg-muted">{t('welcomeIntro')}</p>
      </header>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('welcomeSetupTitle')}</h2>
          <p className="mt-1 text-lg text-fg-muted">{t('welcomeSetupIntro')}</p>
        </div>

        <Group label={t('language')}>
          {LANGUAGES.map((l) => (
            <Tile
              key={l.id}
              active={settings.lang === l.id}
              onClick={() => set('lang', l.id)}
              title={l.nativeName}
              lang={l.id}
            />
          ))}
        </Group>

        {/* Only shown for the interface languages that have no content of
            their own. A German or English reader already has the questions in
            the language they picked, and does not need the choice explained. */}
        {!hasContent(settings.lang) ? (
          <>
            <Group label={t('contentLanguage')}>
              {LANGUAGES.filter((l) => hasContent(l.id)).map((l) => (
                <Tile
                  key={l.id}
                  active={settings.contentLang === l.id}
                  onClick={() => set('contentLang', l.id as 'de' | 'en')}
                  title={l.nativeName}
                  lang={l.id}
                />
              ))}
            </Group>
            <Notice title={t('contentNoticeTitle')}>{t('contentNoticeBody')}</Notice>
          </>
        ) : null}

        <Group label={t('textSize')}>
          {TEXT_SIZES.map((s) => (
            <Tile
              key={s}
              active={settings.textSize === s}
              onClick={() => set('textSize', s)}
              title={t(SIZE_KEY[s])}
              /* Each tile previews its own size, so the choice is visible
                 before it is made rather than only after. */
              titleStyle={{ fontSize: `${0.9 + TEXT_SIZES.indexOf(s) * 0.28}rem` }}
            />
          ))}
        </Group>

        <Group label={t('colours')}>
          {THEMES.map((th) => (
            <Tile
              key={th}
              active={settings.theme === th}
              onClick={() => set('theme', th)}
              title={t(THEME_KEY[th])}
              swatch={THEME_SWATCH[th]}
            />
          ))}
        </Group>

        <Group label={t('plainWords')} hint={t('plainWordsHint')}>
          <Tile
            active={settings.plainWords}
            onClick={() => set('plainWords', true)}
            title={t('plainWordsOn')}
          />
          <Tile
            active={!settings.plainWords}
            onClick={() => set('plainWords', false)}
            title={t('plainWordsOff')}
          />
        </Group>

        <Group label={t('answerMode')}>
          <Tile
            active={settings.answerMode === 'tap'}
            onClick={() => set('answerMode', 'tap')}
            title={t('answerByTap')}
            hint={t('answerByTapHint')}
          />
          {canUseVoice ? (
            <Tile
              active={settings.answerMode === 'voice'}
              onClick={() => set('answerMode', 'voice')}
              title={t('answerByVoice')}
              hint={t('answerByVoiceHint')}
            />
          ) : null}
        </Group>

        {!canUseVoice ? (
          <p className="text-base text-fg-muted">{t('voiceUnavailable')}</p>
        ) : null}

        {canReadAloud ? (
          <Group label={t('readAloud')}>
            <Tile
              active={settings.autoRead}
              onClick={() => set('autoRead', true)}
              title={t('plainWordsOn')}
            />
            <Tile
              active={!settings.autoRead}
              onClick={() => set('autoRead', false)}
              title={t('plainWordsOff')}
            />
          </Group>
        ) : null}

        <Group label={t('pace')}>
          <Tile
            active={settings.pace === 'one'}
            onClick={() => set('pace', 'one')}
            title={t('paceOne')}
            hint={t('paceOneHint')}
          />
          <Tile
            active={settings.pace === 'list'}
            onClick={() => set('pace', 'list')}
            title={t('paceList')}
            hint={t('paceListHint')}
          />
        </Group>
      </section>

      <Notice title={t('privacyTitle')}>{t('privacyBody')}</Notice>

      <div>
        <Button onClick={onStart} wide>
          {t('start')}
        </Button>
      </div>
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
      <legend className="text-lg font-semibold">{label}</legend>
      {hint ? <p className="mb-1 text-base text-fg-muted">{hint}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Tile({
  active,
  onClick,
  title,
  hint,
  lang,
  swatch,
  titleStyle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  lang?: string;
  swatch?: { bg: string; fg: string; line: string };
  titleStyle?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      lang={lang}
      // A language endonym must survive browser translation intact.
      translate={lang ? 'no' : undefined}
      aria-pressed={active}
      onClick={onClick}
      className={`target bordered flex items-start gap-3 rounded-lg px-4 py-3 text-start ${
        active ? 'border-accent-line bg-accent text-accent-fg' : 'bg-surface hover:bg-surface-2'
      }`}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 rounded border px-2 py-1 text-sm font-bold"
          style={{ background: swatch.bg, color: swatch.fg, borderColor: swatch.line }}
        >
          Aa
        </span>
      ) : null}
      <span className="flex-1">
        <span
          className={`block text-lg ${active ? 'font-bold' : 'font-semibold'}`}
          style={titleStyle}
        >
          {title}
        </span>
        {hint ? (
          <span
            // Full strength when selected. See the note in ui.tsx; 80%
            // opacity on the accent falls below the 7:1 the palette promises.
            className={`mt-0.5 block text-base ${active ? '' : 'text-fg-muted'}`}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}
