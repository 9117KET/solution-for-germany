/**
 * What is read back from the device is not trusted.
 *
 * The failure that matters is not a crash: it is a restore that quietly
 * inflates a module and hands a family a Pflegegrad they will not get. So most
 * of these tests are about a stored file that is wrong rather than one that is
 * right.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { clearSession, hasContent, loadSession, saveSession, type SavedSession } from './session';
import { emptyIntake } from './score';
import { assess } from '../rules/nba';
import { scoreIntake } from './score';

const KEY = 'anspruch.session.v1';

/** A minimal localStorage, since these tests run without a browser. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const base = (over: Partial<SavedSession> = {}): SavedSession => ({
  answers: emptyIntake(),
  currentGrade: 0,
  bescheidDate: '',
  claimed: [],
  circumstances: { atHome: true, sharedHousehold: false, wantsHomeAdaptation: false },
  order: [],
  index: 0,
  savedAt: '2026-08-26T10:00:00.000Z',
  ...over,
});

const write = (raw: unknown) =>
  globalThis.localStorage.setItem(KEY, JSON.stringify(raw));

beforeEach(() => {
  const storage = new MemoryStorage();
  // @ts-expect-error a stand-in for the browser's storage, which is all the module uses
  globalThis.window = globalThis;
  // @ts-expect-error same
  globalThis.localStorage = storage;
});

describe('round trip', () => {
  it('gives back what it was given', () => {
    const s = base({
      answers: { ...emptyIntake(), levels: { '1.1': 2, '4.8': 3 } },
      currentGrade: 2,
      claimed: ['pflegegeld'],
      index: 7,
    });
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('leaves no trace when nothing has been answered', () => {
    // Opening the page and closing it again must not write anything: on a
    // shared computer the absence of a file is itself the privacy promise.
    saveSession(base());
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();
    expect(loadSession()).toBeNull();
  });

  it('erases on request', () => {
    saveSession(base({ answers: { ...emptyIntake(), levels: { '1.1': 1 } } }));
    expect(loadSession()).not.toBeNull();
    clearSession();
    expect(loadSession()).toBeNull();
    expect(globalThis.localStorage.getItem(KEY)).toBeNull();
  });
});

describe('a stored file that cannot be trusted', () => {
  it('drops criteria this version does not have', () => {
    // The shape a stale file takes after the instrument is edited. Keeping an
    // unknown id would mean scoring something the engine cannot explain.
    write(base({ answers: { conditions: {}, levels: { '1.1': 1, '9.9': 3 }, frequencies: {} } }));
    expect(loadSession()!.answers.levels).toEqual({ '1.1': 1 });
  });

  it('drops levels outside the criterion it belongs to', () => {
    write(
      base({
        answers: {
          conditions: {},
          // 4.13 has three outcomes, so index 3 is out of range for it while
          // being perfectly ordinary for every other criterion.
          levels: { '1.1': 9, '4.13': 3, '1.2': -1, '1.3': 1.5, '1.4': 2 },
          frequencies: {},
        },
      }),
    );
    expect(loadSession()!.answers.levels).toEqual({ '1.4': 2 });
  });

  it('never lets a restored file score higher than the answers allow', () => {
    // The whole point, stated as arithmetic: a hand-edited file claiming
    // impossible levels must not out-score an honest maximum.
    write(
      base({
        answers: {
          // Module 2 is gated, so the gate has to be on for the one honest
          // answer below to reach the score at all.
          conditions: { hasCognitiveIssues: true },
          // One honest answer so the file still counts as a session at all,
          // and five impossible ones that must contribute nothing.
          levels: { '2.1': 1, '1.1': 99, '1.2': 99, '1.3': 99, '1.4': 99, '1.5': 99 },
          frequencies: {},
        },
      }),
    );
    const raw = scoreIntake(loadSession()!.answers).raw;
    expect(raw.m1).toBe(0);
    expect(raw.m2).toBe(1);
    expect(assess(raw).grade).toBe(0);
  });

  it('drops module 5 rows that are not module 5 rows, and caps the count', () => {
    write(
      base({
        answers: {
          conditions: {},
          levels: {},
          frequencies: {
            '5.1': { count: 2, per: 'day' },
            '5.99': { count: 1, per: 'day' },
            '5.2': { count: 10000, per: 'day' },
            '5.3': { count: 1, per: 'fortnight' as never },
            '5.4': { count: 0, per: 'day' },
          },
        },
      }),
    );
    const f = loadSession()!.answers.frequencies;
    expect(f['5.1']).toEqual({ count: 2, per: 'day' });
    expect(f['5.2']).toEqual({ count: 99, per: 'day' });
    expect(f['5.99']).toBeUndefined();
    expect(f['5.3']).toBeUndefined();
    expect(f['5.4']).toBeUndefined();
  });

  it('drops unknown conditions and benefits', () => {
    write(
      base({
        answers: {
          conditions: { hasIncontinence: true, hasWings: true } as never,
          levels: {},
          frequencies: {},
        },
        claimed: ['pflegegeld', 'lottery-win'] as never,
      }),
    );
    const s = loadSession()!;
    expect(s.answers.conditions).toEqual({ hasIncontinence: true });
    expect(s.claimed).toEqual(['pflegegeld']);
  });

  it('falls back rather than throwing on a grade or index that makes no sense', () => {
    write(
      base({
        answers: { ...emptyIntake(), levels: { '1.1': 1 } },
        currentGrade: 9 as never,
        index: -4,
      }),
    );
    const s = loadSession()!;
    expect(s.currentGrade).toBe(0);
    expect(s.index).toBe(0);
  });

  it('survives a truncated or foreign file', () => {
    globalThis.localStorage.setItem(KEY, '{"answers":{"lev');
    expect(loadSession()).toBeNull();
    globalThis.localStorage.setItem(KEY, '"a string"');
    expect(loadSession()).toBeNull();
    globalThis.localStorage.setItem(KEY, 'null');
    expect(loadSession()).toBeNull();
  });

  it('treats a file emptied by validation as no file at all', () => {
    // Everything in it was dropped, so offering to "carry on" would hand the
    // person a blank form and call it their earlier work.
    write(base({ answers: { conditions: {}, levels: { '9.9': 3 }, frequencies: {} } }));
    expect(loadSession()).toBeNull();
  });
});

describe('hasContent', () => {
  it('does not count the defaults as having said anything', () => {
    expect(hasContent(base())).toBe(false);
  });

  it.each([
    ['a level', { answers: { ...emptyIntake(), levels: { '1.1': 0 } } }],
    ['a condition', { answers: { ...emptyIntake(), conditions: { hasIncontinence: false } } }],
    ['a diet level', { answers: { ...emptyIntake(), dietLevel: 0 } }],
    ['a claimed benefit', { claimed: ['pflegegeld' as const] }],
    ['an awarded grade', { currentGrade: 2 as const }],
    ['a Bescheid date', { bescheidDate: '2026-01-15' }],
    [
      'care that is not at home',
      { circumstances: { atHome: false, sharedHousehold: false, wantsHomeAdaptation: false } },
    ],
  ])('counts %s, even when the answer is a zero or a no', (_label, over) => {
    expect(hasContent(base(over))).toBe(true);
  });
});

describe('without a browser', () => {
  it('does nothing rather than throwing', () => {
    // @ts-expect-error removing the browser is the case under test
    delete globalThis.window;
    expect(loadSession()).toBeNull();
    expect(() => saveSession(base())).not.toThrow();
    expect(() => clearSession()).not.toThrow();
  });
});
