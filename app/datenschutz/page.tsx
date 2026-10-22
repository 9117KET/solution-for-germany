import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { isEnabled } from '@/lib/analytics';
import { DATENSCHUTZ_TITLE, datenschutzForBuild } from '@/lib/legal/datenschutz';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | Anspruch',
  description:
    'Was diese Seite speichert, was sie zählt und welche Rechte Sie haben. Privacy policy, in German and English.',
};

export default function DatenschutzPage() {
  // Fixed at build time, like the analytics script in the layout, so the page
  // states the truth of the build it is part of.
  return <LegalPage title={DATENSCHUTZ_TITLE} sections={datenschutzForBuild(isEnabled())} />;
}
