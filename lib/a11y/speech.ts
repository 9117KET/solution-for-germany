/**
 * Reading questions aloud, and listening to spoken answers.
 *
 * Both sit on browser APIs that may simply not be there: speech synthesis is
 * near-universal, recognition is not, and recognition additionally needs a
 * microphone the person has to grant. So the rule throughout is that voice is
 * an *addition* to tapping, never a replacement. Every question stays fully
 * answerable by tapping even while voice mode is on, and any failure degrades
 * to that quietly instead of blocking the flow.
 *
 * `matchSpokenAnswer` is deliberately a pure function, kept apart from the
 * browser plumbing, because it is the part with the interesting behaviour and
 * it needs testing without a microphone.
 */

import { bcp47, type Lang } from '../i18n';

// ------------------------------------------------------- understanding speech

export type SpokenIntent =
  /** Pick the option at this index. */
  | { kind: 'option'; index: number }
  /** Move on. */
  | { kind: 'next' }
  /** Go back. */
  | { kind: 'back' }
  /** Say the question again. */
  | { kind: 'repeat' }
  /** Nothing usable was heard. */
  | { kind: 'none' };

/**
 * Spoken forms of the numbers 1–6, which is as high as any scale here goes.
 * Digits are included because recognisers often return "3" rather than "three".
 */
const NUMBER_WORDS: Record<Lang, readonly string[][]> = {
  de: [
    ['1', 'eins', 'ein', 'eine', 'erste', 'erstens'],
    ['2', 'zwei', 'zwo', 'zweite', 'zweitens'],
    ['3', 'drei', 'dritte', 'drittens'],
    ['4', 'vier', 'vierte', 'viertens'],
    ['5', 'fünf', 'funf', 'fuenf', 'fünfte'],
    ['6', 'sechs', 'sechste'],
  ],
  en: [
    ['1', 'one', 'first'],
    ['2', 'two', 'too', 'second'],
    ['3', 'three', 'third'],
    ['4', 'four', 'for', 'fourth'],
    ['5', 'five', 'fifth'],
    ['6', 'six', 'sixth'],
  ],
  tr: [
    ['1', 'bir', 'birinci'],
    ['2', 'iki', 'ikinci'],
    ['3', 'üç', 'uc', 'üçüncü'],
    ['4', 'dört', 'dort', 'dördüncü'],
    ['5', 'beş', 'bes', 'beşinci'],
    ['6', 'altı', 'alti', 'altıncı'],
  ],
  ru: [
    ['1', 'один', 'одна', 'первый', 'первое'],
    ['2', 'два', 'две', 'второй', 'второе'],
    ['3', 'три', 'третий', 'третье'],
    ['4', 'четыре', 'четвёртый', 'четвертый'],
    ['5', 'пять', 'пятый', 'пятое'],
    ['6', 'шесть', 'шестой', 'шестое'],
  ],
  pl: [
    ['1', 'jeden', 'jedna', 'pierwszy', 'pierwsze'],
    ['2', 'dwa', 'dwie', 'drugi', 'drugie'],
    ['3', 'trzy', 'trzeci', 'trzecie'],
    ['4', 'cztery', 'czwarty', 'czwarte'],
    ['5', 'pięć', 'piec', 'piąty', 'piate'],
    ['6', 'sześć', 'szesc', 'szósty', 'szoste'],
  ],
  ar: [
    ['1', 'واحد', 'واحدة', 'الأول', 'اول'],
    ['2', 'اثنان', 'اثنين', 'إثنين', 'الثاني'],
    ['3', 'ثلاثة', 'ثلاث', 'الثالث'],
    ['4', 'أربعة', 'اربعة', 'الرابع'],
    ['5', 'خمسة', 'الخامس'],
    ['6', 'ستة', 'السادس'],
  ],
};

const COMMANDS: Record<Lang, Record<'next' | 'back' | 'repeat', readonly string[]>> = {
  de: {
    next: ['weiter', 'nächste', 'naechste', 'weiter bitte', 'fertig'],
    back: ['zurück', 'zuruck', 'zurueck', 'vorherige'],
    repeat: ['wiederholen', 'wiederhole', 'noch mal', 'nochmal', 'vorlesen', 'was'],
  },
  en: {
    next: ['next', 'continue', 'forward', 'done'],
    back: ['back', 'previous', 'go back'],
    repeat: ['repeat', 'again', 'say again', 'read again', 'what'],
  },
  tr: {
    next: ['ileri', 'devam', 'sonraki', 'tamam', 'bitti'],
    back: ['geri', 'önceki', 'onceki'],
    repeat: ['tekrar', 'tekrarla', 'yine', 'tekrar oku'],
  },
  ru: {
    next: ['дальше', 'далее', 'следующий', 'готово', 'продолжить'],
    back: ['назад', 'обратно', 'предыдущий'],
    repeat: ['повторить', 'повтори', 'ещё раз', 'еще раз', 'что'],
  },
  pl: {
    next: ['dalej', 'następne', 'nastepne', 'gotowe', 'kontynuuj'],
    back: ['wstecz', 'cofnij', 'poprzednie', 'wróć', 'wroc'],
    repeat: ['powtórz', 'powtorz', 'jeszcze raz', 'co'],
  },
  ar: {
    next: ['التالي', 'التالى', 'تابع', 'متابعة', 'انتهيت'],
    back: ['رجوع', 'ارجع', 'السابق', 'للخلف'],
    repeat: ['أعد', 'اعد', 'كرر', 'مرة أخرى', 'مرة اخرى'],
  },
};

/** Lower-case, strip punctuation, collapse whitespace. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:„“”"'’()«»،؛؟]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Does the phrase appear in the text as a whole word (or run of words)? */
function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^| )${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(text);
}

/**
 * Work out what a spoken phrase was trying to do.
 *
 * Options are matched three ways, in order of how reliable they are:
 *
 *  1. The number of the option — what the interface actually tells people to
 *     say, and by far the most robust thing to recognise.
 *  2. The full wording of the option, in case they read it out.
 *  3. A distinctive word from the option, but only where that word belongs to
 *     exactly one option. Guessing between two near-matches would silently
 *     record a wrong answer about someone's care needs, which is worse than
 *     asking again.
 *
 * Commands are checked before options so that "zurück" is never read as a
 * fuzzy match on an option that happens to contain the word.
 */
export function matchSpokenAnswer(
  transcript: string,
  options: readonly string[],
  lang: Lang,
): SpokenIntent {
  const text = normalise(transcript);
  if (!text) return { kind: 'none' };

  const cmds = COMMANDS[lang];
  for (const kind of ['repeat', 'back', 'next'] as const) {
    if (cmds[kind].some((p) => hasPhrase(text, normalise(p)))) return { kind };
  }

  // 1. By number.
  const numbers = NUMBER_WORDS[lang];
  for (let i = 0; i < options.length && i < numbers.length; i++) {
    if (numbers[i].some((w) => hasPhrase(text, w))) return { kind: 'option', index: i };
  }

  // 2. By the whole option wording.
  const normalisedOptions = options.map(normalise);
  for (let i = 0; i < normalisedOptions.length; i++) {
    if (normalisedOptions[i] && hasPhrase(text, normalisedOptions[i])) {
      return { kind: 'option', index: i };
    }
  }

  // 3. By a word that belongs to only one option.
  const spoken = new Set(text.split(' ').filter((w) => w.length > 3));
  const hits: number[] = [];
  for (let i = 0; i < normalisedOptions.length; i++) {
    const words = normalisedOptions[i].split(' ').filter((w) => w.length > 3);
    const unique = words.filter(
      (w) => !normalisedOptions.some((other, j) => j !== i && other.includes(w)),
    );
    if (unique.some((w) => spoken.has(w))) hits.push(i);
  }
  if (hits.length === 1) return { kind: 'option', index: hits[0] };

  return { kind: 'none' };
}

/** The closing instruction of every spoken question. */
const ASK_FOR_NUMBER: Record<Lang, string> = {
  de: 'Sagen Sie die Nummer Ihrer Antwort.',
  en: 'Say the number of your answer.',
  tr: 'Cevabınızın numarasını söyleyin.',
  ru: 'Назовите номер вашего ответа.',
  pl: 'Powiedz numer swojej odpowiedzi.',
  ar: 'قل رقم إجابتك.',
};

/** A run of text together with the language it is actually written in. */
export interface SpokenSegment {
  text: string;
  lang: Lang;
}

/**
 * What to read out for a question, split by language.
 *
 * A question screen is genuinely bilingual: the question and its answers are
 * content (German or English), while the closing instruction is interface copy
 * (any of the six). Reading the whole thing with one voice means a Turkish
 * voice attempting German words, which is not accented — it is unintelligible.
 *
 * So the script comes back as segments, each carrying its own language, and the
 * synthesiser picks a voice per segment. The voice then matches the text on the
 * screen, which is the only way the two are of any use together.
 *
 * The options are numbered aloud because the number is what the person is then
 * asked to say back. Reading the options without numbering them leaves them
 * repeating the wording, which recognisers handle far less reliably.
 */
export function spokenScript(
  question: string,
  options: readonly string[],
  contentLang: Lang,
  chromeLang: Lang,
  hint?: string,
  /**
   * The language of the options, when it differs from the question's.
   *
   * A gating question is exactly this case: the question is German content but
   * the answers are "Ja / Nein" in whatever language the interface is set to.
   */
  optionsLang: Lang = contentLang,
): SpokenSegment[] {
  const intro = hint ? `${question}. ${hint}` : question;
  const numbered = options.map((o, i) => `${i + 1}: ${o}`).join('. ');
  return mergeAdjacent([
    { text: `${intro}.`, lang: contentLang },
    { text: `${numbered}.`, lang: optionsLang },
    { text: ASK_FOR_NUMBER[chromeLang], lang: chromeLang },
  ]);
}

/**
 * Join neighbouring segments that share a language.
 *
 * Every utterance boundary is an audible pause, so a script that is really one
 * language should be one utterance. This keeps the common case — a German
 * interface reading German questions — as a single flowing sentence.
 */
function mergeAdjacent(segments: readonly SpokenSegment[]): SpokenSegment[] {
  const out: SpokenSegment[] = [];
  for (const segment of segments) {
    if (!segment.text.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.lang === segment.lang) last.text = `${last.text} ${segment.text}`;
    else out.push({ ...segment });
  }
  return out;
}

/** Flatten a script for display or comparison. */
export function scriptText(segments: readonly SpokenSegment[]): string {
  return segments.map((s) => s.text).join(' ');
}

// -------------------------------------------------------- browser capabilities

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

/** The recognition constructor, under whichever name this browser uses. */
export function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionCtor() !== null;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pick a voice for the language, preferring one the platform ships locally.
 *
 * Returns null when the voice list has not loaded yet, which is normal on the
 * first call in Chrome; the synthesiser falls back to its default voice, which
 * is fine.
 */
export function voiceFor(lang: Lang): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null;
  const tag = bcp47(lang);
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.filter((v) => v.lang.replace('_', '-') === tag);
  const loose = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const pool = exact.length > 0 ? exact : loose;
  return pool.find((v) => v.localService) ?? pool[0] ?? null;
}

export interface SpeakOptions {
  lang: Lang;
  /** Slower than default: the audience for read-aloud is rarely in a hurry. */
  rate?: number;
  onEnd?: () => void;
}

/** Speak a string, cancelling anything already being said. */
export function speak(text: string, options: SpeakOptions): void {
  speakSegments([{ text, lang: options.lang }], options);
}

/**
 * Speak a sequence of segments, each in its own voice.
 *
 * Utterances are queued rather than chained through callbacks, because the
 * synthesiser already queues them in order; `onEnd` is attached to the last one
 * so callers learn when the whole thing has finished.
 *
 * A genuine failure counts as finished — a missing voice must not leave voice
 * mode waiting forever for a sentence that will never end. Being *cancelled*
 * does not: `interrupted` and `canceled` mean someone deliberately stopped the
 * speech, either by pressing stop or by starting a new question, and in both
 * cases whatever was queued to follow must not run. Treating a cancellation as
 * a normal ending is what opens the microphone in the middle of a sentence.
 */
export function speakSegments(
  segments: readonly SpokenSegment[],
  { rate = 0.9, onEnd }: Omit<SpeakOptions, 'lang'> & { lang?: Lang },
): void {
  if (!canSpeak() || segments.length === 0) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  let finished = false;
  const finishOnce = () => {
    if (finished) return;
    finished = true;
    onEnd?.();
  };
  /** Cancellation is not completion: it stops what was meant to follow. */
  const onUtteranceError = (event: SpeechSynthesisErrorEvent) => {
    if (event.error === 'interrupted' || event.error === 'canceled') {
      finished = true;
      return;
    }
    finishOnce();
  };

  segments.forEach((segment, i) => {
    const u = new SpeechSynthesisUtterance(segment.text);
    u.lang = bcp47(segment.lang);
    u.rate = rate;
    const v = voiceFor(segment.lang);
    if (v) u.voice = v;
    if (i === segments.length - 1) u.onend = finishOnce;
    // A failure part-way through must not strand the caller either, but a
    // cancellation must not be mistaken for the sentence having been said.
    u.onerror = onUtteranceError;
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
