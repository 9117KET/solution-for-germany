'use client';

import Script from 'next/script';
import { providerReady, providerScript } from './index';

/**
 * The analytics provider's script, loaded with `next/script` after hydration.
 *
 * `afterInteractive` is the strategy the Next docs name for analytics. It also
 * means the early settings script in `<head>` has long since taken `?via=` out
 * of the address bar, so the first page view never carries the partner slug.
 *
 * The layout renders this only when `isEnabled()`, so a default build does not
 * even reference it.
 */
export function AnalyticsScript() {
  const attrs = providerScript();
  if (!attrs) return null;
  const { src, ...data } = attrs;
  return <Script src={src} strategy="afterInteractive" onReady={providerReady} {...data} />;
}
