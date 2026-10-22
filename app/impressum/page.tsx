import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { IMPRESSUM, IMPRESSUM_TITLE } from '@/lib/legal/impressum';

export const metadata: Metadata = {
  title: 'Impressum | Anspruch',
  description: 'Angaben zum Anbieter dieser Seite nach § 5 DDG. Legal notice, in German and English.',
};

export default function ImpressumPage() {
  return <LegalPage title={IMPRESSUM_TITLE} sections={IMPRESSUM} />;
}
