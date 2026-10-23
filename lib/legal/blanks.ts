/**
 * The operator's details, as marked blanks.
 *
 * Draft for legal review; see docs/COMPLIANCE.md.
 *
 * Nothing here may be guessed. Each open blank is a literal in square brackets
 * and appears as-is on `/impressum` and `/datenschutz` until the operator fills
 * it in, here and only here. A filled value carries no brackets and is no
 * longer a blank. `legal.test.ts` checks that every bracketed literal in the
 * legal texts is one of `BLANKS` and that each of these is used.
 *
 * Filled on 2026-10-23: address and email from the founder's message; the
 * supervisory authority from
 * `.orchestration/runs/2026-10-23-bremen-blanks/scout-bremen.md`, section 1
 * (verified). The name is still open.
 */

export interface LegalSection {
  /** Stable id, used as the anchor of the section. */
  id: string;
  de: LegalText;
  en: LegalText;
}

export interface LegalText {
  heading: string;
  /** Paragraphs. A bare `https://` address in a paragraph is rendered as a link. */
  body: readonly string[];
}

// § 5 Abs. 1 Nr. 1 DDG: name and ladungsfähige Anschrift (no P.O. box).
export const NAME = '[Vor- und Nachname]';
export const STREET = 'Alhardstraße 21';
export const CITY = '28757 Bremen';
// § 5 Abs. 1 Nr. 2 DDG: fast electronic contact, including email.
export const EMAIL = 'kinlotangiri911@gmail.com';
// § 5 Abs. 1 Nr. 3 to 6 DDG: only if they apply to the operator.
export const VAT_ID = '[Umsatzsteuer-Identifikationsnummer oder Wirtschafts-Identifikationsnummer, falls zutreffend]';
export const REGISTER = '[Register und Registernummer, falls zutreffend]';
export const LICENSING_AUTHORITY = '[Zuständige Aufsichtsbehörde für eine zulassungspflichtige Tätigkeit, falls zutreffend]';
export const PROFESSION = '[Berufsrechtliche Angaben bei einem reglementierten Beruf, falls zutreffend]';
// Art. 13(2)(d) DSGVO: the data protection authority of the operator's Land.
// Name and address as on https://www.bfdi.bund.de/SharedDocs/Adressen/DE/LfD/Bremen.html
// and https://www.datenschutz.bremen.de/impressum-1478, which agree.
export const DPA_AUTHORITY =
  'Der Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien Hansestadt Bremen, Georgstraße 122-124, 27570 Bremerhaven, office@datenschutz.bremen.de, https://www.datenschutz.bremen.de/';

/** The filled values. They carry no square brackets. */
export const FILLED = [STREET, CITY, EMAIL, DPA_AUTHORITY] as const;

/** Every open blank, in the order the checklist in docs/COMPLIANCE.md lists them. */
export const BLANKS = [NAME, VAT_ID, REGISTER, LICENSING_AUTHORITY, PROFESSION] as const;
