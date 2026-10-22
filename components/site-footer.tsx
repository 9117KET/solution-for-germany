'use client';

import Link from 'next/link';
import { useT } from './settings';

/**
 * The footer on every screen: Impressum and Datenschutzerklärung.
 *
 * In the interface language, because the links are chrome; the pages behind
 * them are in German and English only. Plain underlined text links with the
 * same 44px-minimum target as every other control, so they grow with the text
 * scale and take their colours from the theme.
 */
export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="no-print border-t-[length:var(--line-width)] border-line">
      <ul className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-1 px-4 py-3">
        <li>
          <Link href="/impressum" className="target inline-flex items-center text-base underline">
            {t('footerImpressum')}
          </Link>
        </li>
        <li>
          <Link href="/datenschutz" className="target inline-flex items-center text-base underline">
            {t('footerDatenschutz')}
          </Link>
        </li>
      </ul>
    </footer>
  );
}
