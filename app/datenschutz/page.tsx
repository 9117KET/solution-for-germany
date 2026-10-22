import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { DATENSCHUTZ, DATENSCHUTZ_TITLE } from '@/lib/legal/datenschutz';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung | Anspruch',
  description:
    'Was diese Seite speichert, was sie zählt und welche Rechte Sie haben. Privacy policy, in German and English.',
};

export default function DatenschutzPage() {
  return <LegalPage title={DATENSCHUTZ_TITLE} sections={DATENSCHUTZ} />;
}
