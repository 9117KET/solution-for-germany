/**
 * The saved intake as an external store.
 *
 * Same shape and same reasoning as `lib/a11y/store.ts`: what is on the device
 * is not React state, and reading it with `useSyncExternalStore` rather than
 * "empty state, then fill it in from an effect" is both what React wants and
 * what gets hydration right. The server renders no offer, hydration matches
 * against no offer, and anything found on the device appears immediately
 * afterwards in one clean re-render.
 *
 * The store holds only the *offer*: a session found on this device that has
 * not yet been taken or thrown away. Once the person has decided, the offer is
 * gone and the intake is ordinary React state again.
 */

import { clearSession, loadSession, type SavedSession } from './session';

/** `undefined` means the device has not been read yet; `null` means nothing to offer. */
let snapshot: SavedSession | null | undefined;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

/**
 * The session waiting to be offered, if any.
 *
 * The cached snapshot is not an optimisation: `useSyncExternalStore` needs the
 * same object back on every call until something actually changes, and a fresh
 * parse each time would re-render forever.
 */
export function getSessionSnapshot(): SavedSession | null {
  if (snapshot === undefined) snapshot = loadSession();
  return snapshot;
}

/** The server has no device to read, so it always renders without an offer. */
export function getServerSessionSnapshot(): SavedSession | null {
  return null;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Stop offering the stored session, but leave it on the device.
 *
 * For when the offer has been accepted, or the person walked past it and
 * started a new intake: their first real answer will overwrite the file, and
 * until then there is no reason to have thrown it away.
 */
export function dismissOffer(): void {
  snapshot = null;
  notify();
}

/** Erase the stored session. The person asked for it to be gone. */
export function discardSession(): void {
  clearSession();
  snapshot = null;
  notify();
}

/** Test seam: forget what was read so the next call re-reads the device. */
export function resetSessionStore(): void {
  snapshot = undefined;
}
