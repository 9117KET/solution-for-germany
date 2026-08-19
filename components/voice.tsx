'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { spokenScript } from '@/lib/a11y/speech';
import { useListener, useSettings, useSpeaker, useT } from './settings';
import { Notice } from './ui';

/** Separator for the options key — a character no option will ever contain. */
const OPTION_SEP = '';

export interface VoiceQuestion {
  /** Stable id, so the question changing can retrigger reading it out. */
  id: string;
  question: string;
  hint?: string;
  options: readonly string[];
  /**
   * Set when the options are interface copy rather than content — a gating
   * question asks something German but answers "Ja / Nein" in the interface
   * language, and each half has to be spoken in its own voice.
   */
  optionsAreChrome?: boolean;
}

/**
 * Read-aloud and speak-your-answer controls for a single question.
 *
 * The two capabilities are kept separate on purpose. Reading aloud works almost
 * everywhere and helps a much wider group than voice input does — poor near
 * vision, tired eyes, reading difficulty — so it is offered on its own and is
 * never gated behind voice mode. Listening is the fragile half: it needs an API
 * this browser may not have and a microphone the person must grant, so it is
 * strictly additive and every failure lands on "tap the answer instead".
 *
 * Voice mode runs one strict sequence per question: read the question, wait for
 * the voice to stop, then open the microphone. The waiting is not politeness —
 * a microphone open while the synthesiser is talking records the synthesiser,
 * and the person's actual answer arrives on top of the app's own voice.
 */
export function VoiceControls({
  q,
  onPick,
  onNext,
  onBack,
}: {
  q: VoiceQuestion;
  onPick: (index: number) => void;
  onNext?: () => void;
  onBack?: () => void;
}) {
  const { settings } = useSettings();
  const { t, lang, contentLang } = useT();
  const speaker = useSpeaker();
  const listener = useListener();
  const voiceMode = settings.answerMode === 'voice';

  // The question and its answers are content; the closing instruction is
  // interface copy. Each is spoken in its own voice, so what is heard matches
  // what is on the screen.
  //
  // Memoised on the *contents* of the options rather than the array, because
  // the caller builds a fresh array on every render. An unmemoised script would
  // be a new object each time, which re-runs the effect below on every render
  // and restarts the sentence forever.
  const optionsKey = q.options.join(OPTION_SEP);
  const optionsLang = q.optionsAreChrome ? lang : contentLang;
  const script = useMemo(
    () =>
      spokenScript(
        q.question,
        optionsKey.split(OPTION_SEP),
        contentLang,
        lang,
        q.hint,
        optionsLang,
      ),
    [q.question, q.hint, optionsKey, contentLang, lang, optionsLang],
  );

  const listen = useCallback(() => {
    listener.start(q.options, (intent) => {
      switch (intent.kind) {
        case 'option':
          onPick(intent.index);
          break;
        case 'next':
          onNext?.();
          break;
        case 'back':
          onBack?.();
          break;
        case 'repeat':
          speaker.say(script);
          break;
        case 'none':
          break;
      }
    });
  }, [listener, onPick, onNext, onBack, q.options, speaker, script]);

  // Held in refs so the read-aloud effect can speak and then listen without
  // taking either as a dependency: both change identity on every render, which
  // would restart the question mid-sentence. Updated in an effect rather than
  // during render, which is where refs are allowed to be written.
  const listenRef = useRef(listen);
  const sayRef = useRef(speaker.say);
  useEffect(() => {
    listenRef.current = listen;
    sayRef.current = speaker.say;
  });

  // Pressing the button by hand: stop talking first, for the same reason.
  const listenNow = useCallback(() => {
    speaker.stop();
    listenRef.current();
  }, [speaker]);

  // Read the question when it changes, if that was asked for. Keyed on the id
  // rather than the text so re-rendering does not restart the sentence.
  const lastRead = useRef<string | null>(null);
  useEffect(() => {
    if (!settings.autoRead && !voiceMode) return;
    if (lastRead.current === q.id) return;
    lastRead.current = q.id;
    // In voice mode the microphone opens by itself once the question has been
    // read. Without this, voice mode promises a hands-free flow and then
    // silently waits for a button press that nobody was told about.
    sayRef.current(script, voiceMode ? () => listenRef.current() : undefined);

    return () => {
      // Tearing this effect down cancels whatever is being said, so the record
      // of "already read" has to go with it — otherwise the question is marked
      // read while nothing was ever heard.
      //
      // This is not hypothetical: React runs every effect setup/cleanup/setup
      // in development, so without this reset the first reading is cancelled by
      // the cleanup and the second is skipped by the guard, and the app is
      // silent. It matters in production too, for anything that remounts.
      lastRead.current = null;
    };
  }, [q.id, settings.autoRead, voiceMode, script]);

  const showListen = voiceMode;
  const canListenHere = listener.status !== 'unsupported';

  return (
    <div className="no-print flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {speaker.supported ? (
          <button
            type="button"
            onClick={() => (speaker.speaking ? speaker.stop() : speaker.say(script))}
            className="target bordered rounded-lg bg-surface px-4 py-2 text-base font-semibold"
          >
            {speaker.speaking ? `⏹ ${t('stopReading')}` : `🔊 ${t('readAloudThis')}`}
          </button>
        ) : null}

        {showListen && canListenHere ? (
          <button
            type="button"
            onClick={() => (listener.status === 'listening' ? listener.stop() : listenNow())}
            className={`target rounded-lg border-[length:var(--line-width)] px-4 py-2 text-base font-bold ${
              listener.status === 'listening'
                ? 'border-accent-line bg-accent text-accent-fg'
                : 'border-line bg-surface'
            }`}
          >
            {listener.status === 'listening' ? `🎙 ${t('listening')}` : `🎙 ${t('listen')}`}
          </button>
        ) : null}
      </div>

      {showListen ? (
        <>
          <p className="text-base text-fg-muted">{t('voiceHelp')}</p>
          {/* Spoken feedback is announced, not just shown, so it reaches
              someone who cannot see the screen well enough to read it. */}
          <div aria-live="polite" className="flex flex-col gap-2">
            {listener.status === 'listening' ? (
              <p className="text-base font-semibold">{t('listening')}</p>
            ) : null}
            {listener.heard ? (
              <p className="text-base">
                <span className="font-semibold">{t('voiceHeard')}:</span> “{listener.heard}”
              </p>
            ) : null}
            {listener.confused ? (
              <Notice tone="warn" title={t('voiceNotUnderstood')}>
                {t('voiceHelp')}
              </Notice>
            ) : null}
            {listener.heardNothing && !listener.confused ? (
              <Notice tone="warn" title={t('voiceHeardNothing')}>
                {t('voiceHelp')}
              </Notice>
            ) : null}
            {listener.status === 'unsupported' ? (
              <Notice title={t('voiceUnavailable')}>{t('answerByTapHint')}</Notice>
            ) : null}
            {listener.status === 'blocked' ? (
              <Notice tone="warn" title={t('micBlocked')}>
                {t('answerByTapHint')}
              </Notice>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * A read-aloud button for a screen that is a form rather than a question.
 *
 * The situation screen has a grade picker, a date and a set of checkboxes —
 * nothing a spoken number can drive. But it is the very first screen after
 * "Start", so leaving it silent means someone who chose to be read to gets
 * silence at the exact moment they are deciding whether any of this works.
 */
export function ReadScreenAloud({ id, text }: { id: string; text: string }) {
  const { settings } = useSettings();
  const { t } = useT();
  const speaker = useSpeaker();

  const sayRef = useRef(speaker.say);
  useEffect(() => {
    sayRef.current = speaker.say;
  });

  const lastRead = useRef<string | null>(null);
  useEffect(() => {
    if (!settings.autoRead && settings.answerMode !== 'voice') return;
    if (lastRead.current === id) return;
    lastRead.current = id;
    sayRef.current(text);
    return () => {
      lastRead.current = null;
    };
  }, [id, text, settings.autoRead, settings.answerMode]);

  if (!speaker.supported) return null;
  return (
    <div className="no-print">
      <button
        type="button"
        onClick={() => (speaker.speaking ? speaker.stop() : speaker.say(text))}
        className="target bordered rounded-lg bg-surface px-4 py-2 text-base font-semibold"
      >
        {speaker.speaking ? `⏹ ${t('stopReading')}` : `🔊 ${t('readAloudThis')}`}
      </button>
    </div>
  );
}
