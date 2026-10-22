/**
 * The operator's details, as marked blanks.
 *
 * Draft for legal review; see docs/COMPLIANCE.md.
 *
 * Nothing here may be guessed. Each blank is a literal in square brackets and
 * appears as-is on `/impressum` and `/datenschutz` until the operator fills it
 * in, here and only here. `legal.test.ts` checks that every bracketed literal
 * in the legal texts is one of these and that each of these is used.
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
export const STREET = '[Straße und Hausnummer]';
export const CITY = '[Postleitzahl und Ort]';
// § 5 Abs. 1 Nr. 2 DDG: fast electronic contact, including email.
export const EMAIL = '[E-Mail-Adresse]';
// § 5 Abs. 1 Nr. 3 to 6 DDG: only if they apply to the operator.
export const VAT_ID = '[Umsatzsteuer-Identifikationsnummer oder Wirtschafts-Identifikationsnummer, falls zutreffend]';
export const REGISTER = '[Register und Registernummer, falls zutreffend]';
export const LICENSING_AUTHORITY = '[Zuständige Aufsichtsbehörde für eine zulassungspflichtige Tätigkeit, falls zutreffend]';
export const PROFESSION = '[Berufsrechtliche Angaben bei einem reglementierten Beruf, falls zutreffend]';
// Art. 13(2)(d) DSGVO: the data protection authority of the operator's Land.
export const DPA_AUTHORITY = '[Datenschutz-Aufsichtsbehörde des Bundeslandes, in dem der Betreiber wohnt, mit Anschrift]';

/** Every blank, in the order the checklist in docs/COMPLIANCE.md lists them. */
export const BLANKS = [
  NAME,
  STREET,
  CITY,
  EMAIL,
  VAT_ID,
  REGISTER,
  LICENSING_AUTHORITY,
  PROFESSION,
  DPA_AUTHORITY,
] as const;
