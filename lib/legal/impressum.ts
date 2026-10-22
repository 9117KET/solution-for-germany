/**
 * Impressum, as data.
 *
 * Draft for legal review; see docs/COMPLIANCE.md.
 *
 * Content follows § 5 DDG for an individual operator as summarised in
 * `.orchestration/runs/2026-10-22-usage-and-partners/scout-compliance.md`,
 * section 1: name, ladungsfähige Anschrift and email; the other items of
 * § 5 Abs. 1 only where they apply. The operator's details are blanks from
 * `./blanks`; nothing here is invented.
 */

import {
  CITY,
  EMAIL,
  LICENSING_AUTHORITY,
  NAME,
  PROFESSION,
  REGISTER,
  STREET,
  VAT_ID,
  type LegalSection,
} from './blanks';

export const IMPRESSUM_TITLE = { de: 'Impressum', en: 'Legal notice (Impressum)' } as const;

export const IMPRESSUM: readonly LegalSection[] = [
  {
    id: 'anbieter',
    de: {
      heading: 'Angaben gemäß § 5 DDG',
      body: [NAME, STREET, CITY],
    },
    en: {
      heading: 'Information under § 5 DDG',
      body: [NAME, STREET, CITY],
    },
  },
  {
    id: 'kontakt',
    de: {
      heading: 'Kontakt',
      body: [`E-Mail: ${EMAIL}`],
    },
    en: {
      heading: 'Contact',
      body: [`Email: ${EMAIL}`],
    },
  },
  {
    id: 'weitere-angaben',
    de: {
      heading: 'Weitere Angaben',
      body: [
        'Die folgenden Angaben sind nur nötig, wenn sie auf den Betreiber zutreffen. Andernfalls entfallen sie.',
        `Umsatzsteuer oder Wirtschaft: ${VAT_ID}`,
        `Register: ${REGISTER}`,
        `Aufsichtsbehörde: ${LICENSING_AUTHORITY}`,
        `Beruf: ${PROFESSION}`,
      ],
    },
    en: {
      heading: 'Further information',
      body: [
        'The following items are needed only if they apply to the operator. Otherwise they are left out.',
        `VAT or business ID: ${VAT_ID}`,
        `Register: ${REGISTER}`,
        `Supervisory authority: ${LICENSING_AUTHORITY}`,
        `Profession: ${PROFESSION}`,
      ],
    },
  },
  {
    id: 'datenschutz',
    de: {
      heading: 'Datenschutz',
      body: ['Wie diese Seite mit Daten umgeht, steht in der Datenschutzerklärung unter /datenschutz.'],
    },
    en: {
      heading: 'Privacy',
      body: ['How this site handles data is set out in the privacy policy at /datenschutz.'],
    },
  },
];
