/**
 * Settings as an external store.
 *
 * Settings are genuinely external state: they live in localStorage and on the
 * document element, not in the React tree. Reading them with
 * `useSyncExternalStore` rather than "empty state, then fill it in from an
 * effect" is both what React wants and what gets hydration right: the server
 * renders `DEFAULTS`, hydration matches against `DEFAULTS`, and the stored
 * settings take over immediately afterwards in one clean re-render.
 */

import { hasContent } from '../i18n';
import { DEFAULTS, applySettings, loadSettings, saveSettings, type Settings } from './settings';

let snapshot: Settings | null = null;
const listeners = new Set<() => void>();

/**
 * The current settings.
 *
 * The cached snapshot is not just an optimisation: `useSyncExternalStore`
 * requires the same object back on every call until something actually changes,
 * or it re-renders forever.
 */
export function getSnapshot(): Settings {
  if (snapshot === null) snapshot = loadSettings();
  return snapshot;
}

/** What the server renders, and what hydration is matched against. */
export function getServerSnapshot(): Settings {
  return DEFAULTS;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const next = { ...getSnapshot(), [key]: value };

  // Choosing German or English as the interface language moves the questions
  // with it: being handed a German interface but English questions would be
  // baffling. The four interface-only languages leave the choice alone,
  // because they have no content of their own to move it to.
  if (key === 'lang' && hasContent(next.lang)) next.contentLang = next.lang;

  snapshot = next;
  applySettings(next);
  saveSettings(next);
  for (const l of listeners) l();
}

/** Test seam: drop the cached snapshot so the next read re-reads storage. */
export function resetStore(): void {
  snapshot = null;
}
