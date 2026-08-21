'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { applySettings, type Settings } from '@/lib/a11y/settings';
import {
  getServerSnapshot,
  getSnapshot,
  setSetting,
  subscribe,
} from '@/lib/a11y/store';
import {
  canListen,
  canSpeak,
  matchSpokenAnswer,
  recognitionCtor,
  speakSegments,
  stopSpeaking,
  type SpokenIntent,
  type SpokenSegment,
} from '@/lib/a11y/speech';
import {
  languageMeta,
  lead,
  official,
  type ContentLang,
  type Lang,
  type Localised,
  type Readable,
} from '@/lib/i18n';
import { translate, type UiKey } from '@/lib/i18n/strings';

interface SettingsContextValue {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Pushing the settings onto the document element is exactly what an effect is
  // for: updating an external system to match React's state. The inline script
  // in the document head has already done this for the first paint, so this is
  // what keeps them in step afterwards.
  useEffect(() => applySettings(settings), [settings]);

  const value = useMemo(() => ({ settings, set: setSetting }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

const noSubscribe = () => () => {};

/**
 * Read a browser capability without tripping over hydration.
 *
 * Capabilities cannot be known on the server, and rendering "voice is
 * available" only to withdraw it a moment later is worse than showing it late.
 * Reported as `false` during server render and hydration, then truthfully.
 */
export function useClientFlag(read: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, read, () => false);
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside a SettingsProvider');
  return ctx;
}

/**
 * Translation helpers bound to the current language.
 *
 * `t` handles interface copy; `s` and `sub` handle the bilingual content
 * objects from the rules engine, respecting the plain-words setting.
 */
export function useT() {
  const { settings } = useSettings();
  const { lang, contentLang, plainWords } = settings;
  return useMemo(
    () => ({
      /** The interface language. One of six. */
      lang,
      /** The language the assessment content is shown in. German or English. */
      contentLang,
      plainWords,
      /** True where the interface language has no content of its own. */
      contentDiffers: lang !== contentLang,
      dir: languageMeta(lang).dir,
      /** Locale for money and numbers, following the interface language. */
      numberLocale: languageMeta(lang).numberLocale,
      /** Interface copy by key. Always in the interface language. */
      t: (key: UiKey, vars?: Record<string, string | number>) => translate(key, lang, vars),
      /** A content string. Always in the content language, never the chrome one. */
      s: (v: Localised) => v[contentLang],
      /** A readable label: everyday wording first when plain words are on. */
      r: (v: Readable) => lead(v, contentLang, plainWords),
      /** The official wording, when it is worth showing as a second line. */
      sub: (v: Readable) => official(v, contentLang, plainWords),
    }),
    [lang, contentLang, plainWords],
  );
}

// ------------------------------------------------------------------ read aloud

export interface Speaker {
  supported: boolean;
  speaking: boolean;
  /**
   * Say something, optionally running `onDone` once the voice has stopped.
   *
   * The callback is what lets voice mode wait before opening the microphone.
   * A microphone opened while the app is still talking hears the app.
   */
  say: (script: string | readonly SpokenSegment[], onDone?: () => void) => void;
  stop: () => void;
}

export function useSpeaker(): Speaker {
  const { settings } = useSettings();
  const [speaking, setSpeaking] = useState(false);
  const supported = useMemo(() => canSpeak(), []);

  const say = useCallback(
    (script: string | readonly SpokenSegment[], onDone?: () => void) => {
      if (!supported) {
        // Nothing will be spoken, so whatever was meant to follow the sentence
        // has to happen anyway, otherwise voice mode stalls on a browser with
        // no synthesiser.
        onDone?.();
        return;
      }
      // A bare string is interface copy; anything bilingual arrives as segments.
      const segments: readonly SpokenSegment[] =
        typeof script === 'string' ? [{ text: script, lang: settings.lang }] : script;
      setSpeaking(true);
      speakSegments(segments, {
        onEnd: () => {
          setSpeaking(false);
          onDone?.();
        },
      });
    },
    [settings.lang, supported],
  );

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  // Never leave a voice talking into an empty room after a navigation.
  useEffect(() => () => stopSpeaking(), []);

  return { supported, speaking, say, stop };
}

// -------------------------------------------------------------------- listening

export type ListenerStatus = 'idle' | 'listening' | 'unsupported' | 'blocked' | 'error';

export interface Listener {
  status: ListenerStatus;
  /** What was last heard, for showing back to the person. */
  heard: string | null;
  /** True when something was heard but could not be matched to an answer. */
  confused: boolean;
  /**
   * True when listening ended without a single word arriving.
   *
   * Distinct from `confused`: one means "I heard you and did not understand",
   * the other means "I heard nothing at all". Without this the microphone
   * simply closes again and the person is left watching a button that changed
   * back for no visible reason.
   */
  heardNothing: boolean;
  start: (options: readonly string[], onIntent: (i: SpokenIntent) => void) => void;
  stop: () => void;
}

/**
 * One-shot listening.
 *
 * Deliberately not continuous: a microphone that stays open is both a privacy
 * problem and a reliability problem, because stray conversation in the room
 * starts answering questions about someone's care. Each answer is one press
 * (or one automatic prompt after the question is read out), one phrase, done.
 */
export function useListener(): Listener {
  const { settings } = useSettings();
  const [status, setStatus] = useState<ListenerStatus>(() =>
    canListen() ? 'idle' : 'unsupported',
  );
  const [heard, setHeard] = useState<string | null>(null);
  const [confused, setConfused] = useState(false);
  const [heardNothing, setHeardNothing] = useState(false);
  const gotResultRef = useRef(false);
  const activeRef = useRef<{ abort: () => void } | null>(null);

  const stop = useCallback(() => {
    activeRef.current?.abort();
    activeRef.current = null;
    setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  useEffect(() => () => activeRef.current?.abort(), []);

  const start = useCallback(
    (options: readonly string[], onIntent: (i: SpokenIntent) => void) => {
      const Ctor = recognitionCtor();
      if (!Ctor) {
        setStatus('unsupported');
        return;
      }
      activeRef.current?.abort();
      setHeard(null);
      setConfused(false);
      setHeardNothing(false);
      gotResultRef.current = false;

      const rec = new Ctor();
      rec.lang = languageMeta(settings.lang).bcp47;
      rec.continuous = false;
      rec.interimResults = false;
      // Ask for several readings and take the first that resolves to an intent;
      // the top-ranked transcript is often a near-miss on a short word.
      rec.maxAlternatives = 4;

      rec.onresult = (e) => {
        gotResultRef.current = true;
        const alternatives: string[] = [];
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          for (let j = 0; j < r.length; j++) alternatives.push(r[j].transcript);
        }
        setHeard(alternatives[0] ?? null);

        for (const phrase of alternatives) {
          const intent = matchSpokenAnswer(phrase, options, settings.lang);
          if (intent.kind !== 'none') {
            setConfused(false);
            onIntent(intent);
            return;
          }
        }
        setConfused(true);
        onIntent({ kind: 'none' });
      };

      rec.onerror = (e) => {
        // `not-allowed` and `service-not-allowed` both mean the microphone was
        // refused, which needs a different message from a general failure.
        setStatus(
          e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'blocked' : 'error',
        );
        activeRef.current = null;
      };

      rec.onend = () => {
        activeRef.current = null;
        // Recognition stops on its own after a stretch of silence. Saying so is
        // the difference between "it is broken" and "it did not hear me".
        if (!gotResultRef.current) setHeardNothing(true);
        setStatus((s) => (s === 'listening' ? 'idle' : s));
      };

      activeRef.current = { abort: () => rec.abort() };
      try {
        rec.start();
        setStatus('listening');
      } catch {
        // Calling start() twice throws; treat it as already listening.
        setStatus('listening');
      }
    },
    [settings.lang],
  );

  return { status, heard, confused, heardNothing, start, stop };
}

export type { ContentLang, Lang, SpokenIntent };
