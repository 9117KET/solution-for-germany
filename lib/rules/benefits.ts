/**
 * Benefit catalogue.
 *
 * All amounts are held in integer cents. Percentages (Kombinationsleistung)
 * are the only source of fractions, so money never touches a float that could
 * accumulate error across a sum.
 *
 * Values are 2026. 2026 is a Nullrunde: the figures are the 1 Jan 2025
 * amounts, which remain in force. See SOURCES for per-benefit provenance.
 */

import { type Pflegegrad } from './nba';
import type { SourceId } from './sources';

export type Cents = number;

export const euro = (n: number): Cents => Math.round(n * 100);
export const toEuros = (c: Cents): number => c / 100;

export function formatEuro(c: Cents, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: c % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(toEuros(c));
}

export type Period = 'month' | 'year' | 'once';

export type BenefitId =
  | 'pflegegeld'
  | 'pflegesachleistung'
  | 'entlastungsbetrag'
  | 'pflegehilfsmittel'
  | 'gemeinsamerJahresbetrag'
  | 'wohnumfeldverbesserung'
  | 'wohngruppenzuschlag';

export interface Benefit {
  id: BenefitId;
  name: { de: string; en: string };
  /** What the money actually does, in the words a family would use. */
  what: { de: string; en: string };
  period: Period;
  source: SourceId;
  /** Entitlement in cents, indexed by Pflegegrad 0–5. Index 0 is always 0. */
  amounts: readonly [Cents, Cents, Cents, Cents, Cents, Cents];
  /** True where the benefit is reimbursed against invoices, never paid as cash. */
  reimbursementOnly: boolean;
  /**
   * True where entitlement depends on circumstances the assessment alone
   * cannot establish (e.g. living in a shared care household). These are
   * reported as "check whether this applies", not as a certain gap.
   */
  conditional: boolean;
  /** Extra condition to state plainly wherever the benefit is shown. */
  caveat?: { de: string; en: string };
}

const _ = euro(0);

export const BENEFITS: readonly Benefit[] = [
  {
    id: 'pflegegeld',
    name: { de: 'Pflegegeld', en: 'Care allowance' },
    what: {
      de: 'Geld, das direkt ausgezahlt wird, wenn Angehörige oder Bekannte die Pflege übernehmen.',
      en: 'Cash paid directly when relatives or friends provide the care.',
    },
    period: 'month',
    source: 'pflegegeld',
    amounts: [_, _, euro(347), euro(599), euro(800), euro(990)],
    reimbursementOnly: false,
    conditional: false,
    caveat: {
      de: 'Wird anteilig gekürzt, wenn gleichzeitig ein Pflegedienst genutzt wird (Kombinationsleistung).',
      en: 'Reduced pro rata if a professional service is used at the same time (Kombinationsleistung).',
    },
  },
  {
    id: 'pflegesachleistung',
    name: { de: 'Pflegesachleistung', en: 'Professional home care' },
    what: {
      de: 'Wert der Leistungen, die ein ambulanter Pflegedienst erbringen kann, wird direkt mit dem Dienst abgerechnet.',
      en: 'Value of services an outpatient care service may provide, billed directly to the service.',
    },
    period: 'month',
    source: 'pflegesachleistung',
    amounts: [_, _, euro(796), euro(1497), euro(1859), euro(2299)],
    reimbursementOnly: true,
    conditional: false,
  },
  {
    id: 'entlastungsbetrag',
    name: { de: 'Entlastungsbetrag', en: 'Relief allowance' },
    what: {
      de: 'Für Haushaltshilfe, Betreuung und Alltagsunterstützung. Gilt schon ab Pflegegrad 1.',
      en: 'For household help, companionship and everyday support. Available from Pflegegrad 1.',
    },
    period: 'month',
    source: 'entlastungsbetrag',
    amounts: [_, euro(131), euro(131), euro(131), euro(131), euro(131)],
    reimbursementOnly: true,
    conditional: false,
    caveat: {
      de: 'Wird nicht bar ausgezahlt. Nicht genutzte Beträge sind übertragbar, verfallen aber nach Ablauf der Übertragungsfrist.',
      en: 'Never paid in cash. Unused amounts carry over, but expire once the carry-over period ends.',
    },
  },
  {
    id: 'pflegehilfsmittel',
    name: { de: 'Pflegehilfsmittel zum Verbrauch', en: 'Consumable care aids' },
    what: {
      de: 'Handschuhe, Desinfektionsmittel, Bettschutzeinlagen und Ähnliches: monatlich, ab Pflegegrad 1.',
      en: 'Gloves, disinfectant, bed protection and similar: monthly, from Pflegegrad 1.',
    },
    period: 'month',
    source: 'pflegehilfsmittel',
    amounts: [_, euro(42), euro(42), euro(42), euro(42), euro(42)],
    reimbursementOnly: true,
    conditional: false,
    caveat: {
      de: 'Nur bei Pflege zu Hause.',
      en: 'Only where care takes place at home.',
    },
  },
  {
    id: 'gemeinsamerJahresbetrag',
    name: { de: 'Gemeinsamer Jahresbetrag', en: 'Pooled annual care budget' },
    what: {
      de: 'Für Vertretung, wenn die pflegende Person ausfällt oder Urlaub braucht, und für Kurzzeitpflege. Frei zwischen beiden aufteilbar.',
      en: 'For cover when the carer is unavailable or needs a break, and for short-term care. Split freely between the two.',
    },
    period: 'year',
    source: 'gemeinsamerJahresbetrag',
    amounts: [_, _, euro(3539), euro(3539), euro(3539), euro(3539)],
    reimbursementOnly: true,
    conditional: false,
    caveat: {
      de: 'Die frühere Wartezeit von sechs Monaten ist seit 1. Juli 2025 abgeschafft, der Anspruch besteht sofort. Wichtig: Übernimmt eine nahe Angehörige oder ein naher Angehöriger die Vertretung, ist die Verhinderungspflege auf das Doppelte des Pflegegeldes begrenzt: 694 € bei Pflegegrad 2, 1.198 € bei 3, 1.600 € bei 4, 1.980 € bei 5. Der volle Betrag gilt für die Kurzzeitpflege und für eine Vertretung durch andere Personen.',
      en: 'The former six-month qualifying period was abolished on 1 July 2025, the entitlement applies immediately. Important: where a close relative provides the cover, Verhinderungspflege is capped at twice the Pflegegeld: €694 at Pflegegrad 2, €1,198 at 3, €1,600 at 4, €1,980 at 5. The full amount applies to short-term care, and to cover provided by anyone else.',
    },
  },
  {
    id: 'wohnumfeldverbesserung',
    name: { de: 'Wohnumfeldverbessernde Maßnahmen', en: 'Home adaptation grant' },
    what: {
      de: 'Zuschuss für Umbauten wie bodengleiche Dusche, Treppenlift oder Türverbreiterung.',
      en: 'Grant towards adaptations such as a level-access shower, stairlift or widened doorways.',
    },
    period: 'once',
    source: 'wohnumfeldverbesserung',
    amounts: [_, euro(4180), euro(4180), euro(4180), euro(4180), euro(4180)],
    reimbursementOnly: true,
    conditional: true,
    caveat: {
      de: 'Je Maßnahme, nicht je Jahr. Vor Baubeginn beantragen. Leben mehrere Anspruchsberechtigte im Haushalt, können bis zu vier Ansprüche gebündelt werden.',
      en: 'Per measure, not per year. Apply before work begins. Where several eligible people share the household, up to four claims may be pooled.',
    },
  },
  {
    id: 'wohngruppenzuschlag',
    name: { de: 'Wohngruppenzuschlag', en: 'Shared-household supplement' },
    what: {
      de: 'Monatlicher Zuschlag für Menschen, die in einer ambulant betreuten Wohngruppe leben.',
      en: 'Monthly supplement for people living in an assisted shared household.',
    },
    period: 'month',
    source: 'wohngruppenzuschlag',
    amounts: [_, euro(224), euro(224), euro(224), euro(224), euro(224)],
    reimbursementOnly: false,
    conditional: true,
    caveat: {
      de: 'Nur in einer ambulant betreuten Wohngruppe mit mindestens drei Bewohnern.',
      en: 'Only in an assisted shared household with at least three residents.',
    },
  },
] as const;

/**
 * Verhinderungspflege ceiling when the substitute carer is a close relative.
 *
 * The Gemeinsamer Jahresbetrag is 3.539 € for the pooled budget, but § 39 SGB XI
 * caps the Verhinderungspflege share at twice the Pflegegeld where a nahe
 * Angehörige stands in, which is the common case, not the exception. The full
 * amount remains available for Kurzzeitpflege and for cover by anyone else.
 *
 * Held here rather than only in the caveat prose so the figures can be checked.
 * Verified against BMG, "Zahlen, Daten und Fakten zur Pflegeversicherung",
 * Stand Juli 2026, table X.
 */
export const VERHINDERUNGSPFLEGE_BY_RELATIVE: readonly [
  Cents, Cents, Cents, Cents, Cents, Cents,
] = [_, _, euro(694), euro(1198), euro(1600), euro(1980)];

export function benefit(id: BenefitId): Benefit {
  const b = BENEFITS.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown benefit id: ${id}`);
  return b;
}

/** Full entitlement for a benefit at a given grade, in cents. */
export function entitlement(id: BenefitId, grade: Pflegegrad): Cents {
  return benefit(id).amounts[grade];
}

/** Every benefit carrying a non-zero entitlement at this grade. */
export function entitlementsFor(grade: Pflegegrad): Array<{ benefit: Benefit; amount: Cents }> {
  return BENEFITS.map((b) => ({ benefit: b, amount: b.amounts[grade] })).filter(
    (e) => e.amount > 0,
  );
}

/**
 * Normalise a benefit to a monthly figure so unlike periods can be compared and
 * summed. One-off grants are excluded: annualising a stairlift would inflate
 * the headline number, which is exactly the kind of dishonesty that destroys
 * trust in a tool like this.
 */
export function monthlyEquivalent(b: Benefit, amount: Cents): Cents | null {
  switch (b.period) {
    case 'month':
      return amount;
    case 'year':
      return Math.round(amount / 12);
    case 'once':
      return null;
  }
}

/**
 * Kombinationsleistung (§ 38 SGB XI).
 *
 * Where professional services are drawn at a fraction of their full value, the
 * care allowance is paid at the complementary fraction. Passing the euro value
 * of services used returns the reduced allowance.
 */
export function kombinationsleistung(
  grade: Pflegegrad,
  sachleistungUsed: Cents,
): { sachleistungShare: number; pflegegeld: Cents } {
  const fullSach = entitlement('pflegesachleistung', grade);
  const fullGeld = entitlement('pflegegeld', grade);

  if (fullSach <= 0) return { sachleistungShare: 0, pflegegeld: fullGeld };

  const share = Math.min(1, Math.max(0, sachleistungUsed / fullSach));
  return {
    sachleistungShare: share,
    pflegegeld: Math.round(fullGeld * (1 - share)),
  };
}
