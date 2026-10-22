/**
 * The Plausible adapter. The only file in the app that knows the vendor.
 *
 * Plausible Cloud was chosen because it sets no cookies and writes nothing to
 * the device, is hosted in the EU, takes custom properties on events, and can
 * hand a partner a shared link limited to their own slug. See
 * `.orchestration/runs/2026-10-22-usage-and-partners/scout-analytics.md`.
 *
 * Configuration, all inlined at build time:
 *
 *   NEXT_PUBLIC_PLAUSIBLE_SRC       the script URL copied from the Plausible
 *                                   dashboard (or the legacy
 *                                   https://plausible.io/js/script.tagged-events.js)
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN    the site's domain as registered there
 *   NEXT_PUBLIC_PLAUSIBLE_ENDPOINT  optional: a proxy for the event API
 *
 * The partner slug is never part of a URL sent to Plausible: the early script
 * in `app/layout.tsx` takes `?via=` out of the address bar before this script
 * loads, and `ready()` additionally strips any query string from the URL that
 * the newer script reports. The slug travels only as the `partner` property.
 */

type PlausibleFn = ((event: string, options?: { props?: Record<string, string> }) => void) & {
  init?: (options: Record<string, unknown>) => void;
};

function src(): string {
  return (process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? '').trim();
}

function domain(): string {
  return (process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? '').trim();
}

function endpoint(): string {
  return (process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT ?? '').trim();
}

/** A script URL is the one thing Plausible cannot do without. */
export function configured(): boolean {
  return /^https:\/\//.test(src());
}

/** Attributes for the `<Script>` tag. The data attributes serve the legacy script. */
export function scriptAttributes(): Record<string, string> {
  const attrs: Record<string, string> = { src: src() };
  if (domain()) attrs['data-domain'] = domain();
  if (endpoint()) attrs['data-api'] = endpoint();
  return attrs;
}

/** `https://x.test/a?b=c#d` becomes `https://x.test/a`. */
export function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** Events fired before the script has loaded wait here, never in storage. */
const pending: Array<[string, Record<string, string>]> = [];
let isReady = false;

function fn(): PlausibleFn | null {
  if (typeof window === 'undefined') return null;
  const p = (window as unknown as { plausible?: unknown }).plausible;
  return typeof p === 'function' ? (p as PlausibleFn) : null;
}

export function send(event: string, props: Record<string, string>): void {
  const p = isReady ? fn() : null;
  if (!p) {
    // Bounded, so a blocked script cannot grow this for the life of the tab.
    if (pending.length < 20) pending.push([event, props]);
    return;
  }
  call(p, event, props);
}

/** Counting must never break the page it counts. */
function call(p: PlausibleFn, event: string, props: Record<string, string>): void {
  try {
    p(event, { props });
  } catch {
    // A broken or blocked vendor script costs one count, nothing more.
  }
}

/**
 * Once the script is in the page.
 *
 * The newer site-specific script is started with `plausible.init()`; the
 * legacy one has no `init` and starts itself. Automatic outbound-link,
 * file-download and form-submission tracking stay off, and the URL is sent
 * without its query string.
 */
export function ready(): void {
  const p = fn();
  if (!p) return;
  if (!isReady && typeof p.init === 'function') {
    const options: Record<string, unknown> = {
      outboundLinks: false,
      fileDownloads: false,
      formSubmissions: false,
      transformRequest: (payload: Record<string, unknown>) => {
        for (const key of ['u', 'url']) {
          const v = payload[key];
          if (typeof v === 'string') payload[key] = withoutQuery(v);
        }
        return payload;
      },
    };
    if (endpoint()) options.endpoint = endpoint();
    try {
      p.init(options);
    } catch {
      // As in `call`: never break the page.
    }
  }
  isReady = true;
  while (pending.length > 0) {
    const [event, props] = pending.shift()!;
    call(p, event, props);
  }
}

/** Test seam. */
export function resetForTests(): void {
  pending.length = 0;
  isReady = false;
}
