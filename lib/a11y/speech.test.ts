/**
 * The speak-then-listen contract.
 *
 * Voice mode hangs its whole flow off "the sentence has finished": that is when
 * the microphone opens. Getting the definition of *finished* wrong is not a
 * cosmetic bug: treating a cancelled utterance as a completed one opens the
 * microphone in the middle of a sentence, and the microphone then records the
 * app's own voice. These tests pin the distinction.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { speakSegments } from './speech';

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: unknown;
  onend?: () => void;
  onerror?: (e: { error: string }) => void;
}

const spoken: FakeUtterance[] = [];

beforeEach(() => {
  spoken.length = 0;
  class Utterance implements FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    voice: unknown = null;
    onend?: () => void;
    onerror?: (e: { error: string }) => void;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('window', {
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: {
      cancel: () => {},
      getVoices: () => [],
      speak: (u: FakeUtterance) => spoken.push(u),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('when a spoken script counts as finished', () => {
  it('reports finished once the last utterance ends', () => {
    const onEnd = vi.fn();
    speakSegments([{ text: 'Frage', lang: 'de' }], { onEnd });
    expect(onEnd).not.toHaveBeenCalled();
    spoken[0].onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('waits for the last segment, not the first', () => {
    const onEnd = vi.fn();
    speakSegments(
      [
        { text: 'Frage', lang: 'de' },
        { text: 'Numarayı söyleyin', lang: 'tr' },
      ],
      { onEnd },
    );
    expect(spoken).toHaveLength(2);
    expect(spoken[0].lang).toBe('de-DE');
    expect(spoken[1].lang).toBe('tr-TR');
    // The German half ending is not the script ending.
    spoken[0].onend?.();
    expect(onEnd).not.toHaveBeenCalled();
    spoken[1].onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it.each(['interrupted', 'canceled'])(
    'does NOT report finished when the speech was cancelled (%s)',
    (error) => {
      // Someone pressed stop, or moved to the next question. Whatever was
      // queued to follow (opening the microphone) must not happen.
      const onEnd = vi.fn();
      speakSegments([{ text: 'Frage', lang: 'de' }], { onEnd });
      spoken[0].onerror?.({ error });
      expect(onEnd).not.toHaveBeenCalled();
    },
  );

  it('stays silent even if a cancelled utterance later reports an end', () => {
    const onEnd = vi.fn();
    speakSegments([{ text: 'Frage', lang: 'de' }], { onEnd });
    spoken[0].onerror?.({ error: 'interrupted' });
    spoken[0].onend?.();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('does report finished on a genuine failure, so nothing is left waiting', () => {
    // A missing voice must not strand voice mode forever.
    const onEnd = vi.fn();
    speakSegments([{ text: 'Frage', lang: 'de' }], { onEnd });
    spoken[0].onerror?.({ error: 'synthesis-failed' });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('reports finished only once, however many events arrive', () => {
    const onEnd = vi.fn();
    speakSegments([{ text: 'Frage', lang: 'de' }], { onEnd });
    spoken[0].onend?.();
    spoken[0].onend?.();
    spoken[0].onerror?.({ error: 'synthesis-failed' });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('reports finished immediately when there is nothing to say', () => {
    const onEnd = vi.fn();
    speakSegments([], { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
