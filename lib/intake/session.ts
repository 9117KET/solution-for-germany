/**
 * The intake, kept on this device.
 *
 * A full run is around seventy questions about someone's worst year. Losing it
 * to a closed tab, a flat battery or an accidental back-swipe is the kind of
 * thing that makes a person give up rather than start again, and the people
 * this is built for are the least likely to start again. So the answers are
 * written to localStorage as they are given, and offered back on the next
 * visit.
 *
 * This does not weaken the promise the product makes. Nothing is sent
 * anywhere: there is still no account and no server. But "stays on your
 * device" and "is still here tomorrow" are different properties, and the
 * second one is the one a shared family computer cares about. Three rules
 * follow:
 *
 *  1. Nothing is written until something has actually been answered. Opening
 *     the page and closing it again leaves no trace.
 *  2. A restored session is never applied silently. The welcome screen says
 *     that answers from this device are here and offers to discard them, so
 *     nobody meets a half-filled form they cannot account for.
 *  3. Erasing is one tap and is genuine: `clearSession` removes the key.
 *
 * Everything read back is treated as hostile. A stored file may have been
 * written by an older version whose criteria differed, hand-edited, or
 * truncated. An unknown criterion id or an out-of-range level is dropped
 * rather than coerced, because the failure that matters here is a restore that
 * silently inflates a module and hands someone a grade they will not get.
 */

import { CRITERIA, CONDITIONS, type ConditionId } from './criteria';
import { askableId, fullPlan } from './adaptive';
import { M5_CRITERIA, type Frequency, type IntakeAnswers, type Per } from './score';
import { BENEFITS, type BenefitId } from '../rules/benefits';
import type { Circumstances } from '../rules/gap';
import type { Pflegegrad } from '../rules/nba';

const STORAGE_KEY = 'anspruch.session.v1';

export interface SavedSession {
  answers: IntakeAnswers;
  currentGrade: Pflegegrad;
  bescheidDate: string;
  claimed: BenefitId[];
  circumstances: Circumstances;
  /**
   * Question ids in the order they were first answered.
   *
   * The intake is adaptive, so the list of questions is derived from the
   * answers rather than fixed. That makes a bare screen number useless on its
   * own: it indexes a sequence that only exists once the order the person
   * actually took is known. Restoring without this would drop someone into a
   * question they had already answered, or past one they had not.
   */
  order: string[];
  /** Screen the person was last on, so they resume where they stopped. */
  index: number;
  /** ISO timestamp of the write, shown when offering the session back. */
  savedAt: string;
}

const CRITERION_BY_ID = new Map(CRITERIA.map((c) => [c.id, c]));
const ASKABLE_IDS = new Set(fullPlan().map(askableId));
const M5_IDS = new Set(M5_CRITERIA.map((c) => c.id));
const CONDITION_IDS = new Set(Object.keys(CONDITIONS) as ConditionId[]);
const BENEFIT_IDS = new Set(BENEFITS.map((b) => b.id));
const PERIODS: readonly Per[] = ['day', 'week', 'month'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** An answered level, or undefined if this id or index is not one we know. */
function parseLevel(id: string, value: unknown): number | undefined {
  const criterion = CRITERION_BY_ID.get(id);
  if (!criterion) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  // Criterion 4.13 has three outcomes where most have four, so the bound comes
  // from the criterion itself rather than from a constant.
  if (value < 0 || value >= criterion.points.length) return undefined;
  return value;
}

function parseFrequency(value: unknown): Frequency | undefined {
  if (!isRecord(value)) return undefined;
  const { count, per } = value;
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return undefined;
  if (typeof per !== 'string' || !PERIODS.includes(per as Per)) return undefined;
  // A hand-edited count of ten thousand a day would sail through the module 5
  // group functions and top the module out. Cap it at something no household
  // reaches honestly.
  return { count: Math.min(count, 99), per: per as Per };
}

function parseAnswers(raw: unknown): IntakeAnswers {
  const out: IntakeAnswers = { conditions: {}, levels: {}, frequencies: {} };
  if (!isRecord(raw)) return out;

  if (isRecord(raw.conditions)) {
    for (const [id, v] of Object.entries(raw.conditions)) {
      if (CONDITION_IDS.has(id as ConditionId) && typeof v === 'boolean') {
        out.conditions[id as ConditionId] = v;
      }
    }
  }

  if (isRecord(raw.levels)) {
    for (const [id, v] of Object.entries(raw.levels)) {
      const level = parseLevel(id, v);
      if (level !== undefined) out.levels[id] = level;
    }
  }

  if (isRecord(raw.frequencies)) {
    for (const [id, v] of Object.entries(raw.frequencies)) {
      if (!M5_IDS.has(id)) continue;
      const f = parseFrequency(v);
      if (f) out.frequencies[id] = f;
    }
  }

  if (typeof raw.dietLevel === 'number' && Number.isInteger(raw.dietLevel)) {
    if (raw.dietLevel >= 0 && raw.dietLevel <= 3) out.dietLevel = raw.dietLevel;
  }

  return out;
}

function parseGrade(v: unknown): Pflegegrad {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 5
    ? (v as Pflegegrad)
    : 0;
}

function parseCircumstances(raw: unknown): Circumstances {
  const fallback: Circumstances = {
    atHome: true,
    sharedHousehold: false,
    wantsHomeAdaptation: false,
  };
  if (!isRecord(raw)) return fallback;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    atHome: bool(raw.atHome, fallback.atHome),
    sharedHousehold: bool(raw.sharedHousehold, fallback.sharedHousehold),
    wantsHomeAdaptation: bool(raw.wantsHomeAdaptation, fallback.wantsHomeAdaptation),
  };
}

/**
 * Has anything actually been said?
 *
 * Used to decide whether a session is worth writing and worth offering back.
 * The rule is "anything that differs from where everyone starts", which keeps
 * two promises at once: a page that is opened and closed leaves nothing on the
 * device, and a person who answered one question and lost their connection
 * gets that one question back.
 *
 * The defaults are deliberately not counted. Someone who never reached the
 * first screen looks exactly like someone who chose "no Pflegegrad, cared for
 * at home", so treating those as answers would write a file for every visit.
 */
export function hasContent(
  s: Pick<SavedSession, 'answers' | 'claimed' | 'currentGrade' | 'bescheidDate' | 'circumstances'>,
): boolean {
  const { conditions, levels, frequencies, dietLevel } = s.answers;
  const { atHome, sharedHousehold, wantsHomeAdaptation } = s.circumstances;
  return (
    Object.keys(levels).length > 0 ||
    Object.keys(frequencies).length > 0 ||
    Object.values(conditions).some((v) => v !== undefined) ||
    dietLevel !== undefined ||
    s.claimed.length > 0 ||
    s.currentGrade !== 0 ||
    s.bescheidDate !== '' ||
    atHome !== true ||
    sharedHousehold !== false ||
    wantsHomeAdaptation !== false
  );
}

export function loadSession(): SavedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const raw: unknown = JSON.parse(stored);
    if (!isRecord(raw)) return null;

    const session: SavedSession = {
      answers: parseAnswers(raw.answers),
      currentGrade: parseGrade(raw.currentGrade),
      bescheidDate: typeof raw.bescheidDate === 'string' ? raw.bescheidDate.slice(0, 10) : '',
      claimed: Array.isArray(raw.claimed)
        ? raw.claimed.filter(
            (id): id is BenefitId => typeof id === 'string' && BENEFIT_IDS.has(id as BenefitId),
          )
        : [],
      circumstances: parseCircumstances(raw.circumstances),
      // Unknown ids are dropped rather than kept: a question id from an older
      // version no longer resolves to anything, and carrying it would leave a
      // hole in the restored sequence.
      order: Array.isArray(raw.order)
        ? raw.order.filter((id): id is string => typeof id === 'string' && ASKABLE_IDS.has(id))
        : [],
      index:
        typeof raw.index === 'number' && Number.isInteger(raw.index) && raw.index >= 0
          ? raw.index
          : 0,
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '',
    };

    // A file that survived parsing but carries nothing is the same as no file.
    return hasContent(session) ? session : null;
  } catch {
    // Blocked storage, a truncated write, someone else's key: none of it is
    // worth a broken page. Start clean.
    return null;
  }
}

export function saveSession(s: SavedSession): void {
  if (typeof window === 'undefined') return;
  if (!hasContent(s)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private browsing, a full quota, a locked-down device. The intake simply
    // does not outlive the tab, which is the behaviour we had before.
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do, and nothing that should reach the person.
  }
}
