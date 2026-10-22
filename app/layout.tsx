import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/components/settings";
import { A11yBar } from "@/components/a11y-bar";
import { SiteFooter } from "@/components/site-footer";
import { isEnabled } from "@/lib/analytics";
import { AnalyticsScript } from "@/lib/analytics/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anspruch: welche Pflegeleistungen Ihnen zustehen",
  description:
    "Schätzen Sie ein, welcher Pflegegrad wahrscheinlich herauskommt, und sehen Sie, " +
    "welche Leistungen nach SGB XI Sie noch nicht bekommen. Läuft vollständig in Ihrem Browser.",
  other: {
    // Turn off the browser's own machine translation.
    //
    // Chrome sees `lang="de"`, decides the reader wants English, and rewrites
    // the page, so choosing "Deutsch" in the language picker still produced an
    // English screen. That alone would be reason enough, but the worse part is
    // what it translates: euro amounts, paragraph references and the statutory
    // caveats. This product deliberately refuses to ship translations of that
    // material without a native speaker's review; letting the browser
    // machine-translate the same text behind our back is the identical hazard,
    // just harder to notice.
    //
    // The cost is real: a speaker of a language we do not offer loses a
    // fallback. Six languages and an explicit content-language notice are the
    // answer to that, and deleting this line is all it takes to reverse the
    // decision.
    google: "notranslate",
  },
};

/**
 * Applies stored display settings before the first paint.
 *
 * Without this, someone who chose very large text or yellow-on-black sees the
 * default rendering flash past on every page load before their settings are
 * restored from an effect. For a person who needs those settings that flash is
 * not a cosmetic detail: it is a screen they cannot read, every single time.
 *
 * Deliberately duplicates a little of `lib/a11y/settings.ts` rather than
 * importing it: this has to be a tiny synchronous script in the document head,
 * before React exists. The scale table and storage key are kept in step by
 * `a11y.test.ts`.
 *
 * It also takes a partner link (`?via=<slug>`) out of the address bar. This
 * has to happen here, before any analytics script can report the page URL:
 * the slug may reach the provider only as the `partner` event property, never
 * inside a URL. A valid slug is kept in memory only (`window.__anspruchPartner`)
 * and is never written to any storage: keeping it on the device would serve
 * attribution rather than the person, which § 25 TDDDG does not exempt. A
 * reload or a new tab loses it, deliberately. The slug pattern is kept in step
 * with `lib/analytics` by `analytics.test.ts`.
 */
const APPLY_SETTINGS_EARLY = `
(function(){try{
  try {
    var u = new URL(location.href);
    var via = u.searchParams.get('via');
    if (via !== null) {
      via = via.toLowerCase();
      if (/^[a-z0-9-]{1,40}$/.test(via)) window.__anspruchPartner = via;
      u.searchParams.delete('via');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    }
  } catch(e){}
  var raw = localStorage.getItem('anspruch.settings.v1');
  var s = raw ? JSON.parse(raw) : {};
  var scale = {normal:1, large:1.25, larger:1.5, largest:1.9};
  var d = document.documentElement;
  d.style.setProperty('--text-scale', String(scale[s.textSize] || 1.25));
  var theme = s.theme;
  if (!theme) {
    theme = window.matchMedia('(prefers-contrast: more)').matches ? 'contrast-light'
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  d.dataset.theme = theme;
  d.dataset.contrast = theme.indexOf('contrast') === 0 ? 'high' : 'normal';
  if (s.lang) {
    d.lang = s.lang;
    d.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
  }
}catch(e){}})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      data-theme="light"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_SETTINGS_EARLY }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SettingsProvider>
          {/* Skip link, for keyboard users who would otherwise tab through the
              whole display bar on every screen. */}
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
          >
            Zum Inhalt springen
          </a>
          <A11yBar />
          <div id="content" className="flex flex-1 flex-col">
            {children}
          </div>
          {/* After the content, so the skip link stays first in tab order. */}
          <SiteFooter />
        </SettingsProvider>
        {/* Nothing at all unless the build switched analytics on. */}
        {isEnabled() ? <AnalyticsScript /> : null}
      </body>
    </html>
  );
}
