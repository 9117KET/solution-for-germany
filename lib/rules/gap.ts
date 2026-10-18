/**
 * Gap analysis: entitlement minus what the household actually claims.
 *
 * The headline figure this file produces is the single number the whole product
 * rests on, so it is deliberately conservative:
 *
 *  - One-off grants never enter the monthly headline.
 *  - Conditional benefits are reported as "check whether this applies", never
 *    counted as certain money.
 *  - Pflegegeld and Pflegesachleistung are treated as ONE entitlement, not two.
 *    They are alternatives under § 38 SGB XI; adding them together would roughly
 *    double every headline and would be straightforwardly false.
 *  - The Gemeinsamer Jahresbetrag enters the headline at the figure a household
 *    covered by a nahe Angehörige can actually draw, not at the full pooled
 *    budget. See `headlineEntitlement`.
 *
 * A number that is too high is worse than no number at all: the family finds
 * out at the Pflegekasse, and never trusts anything the tool said again.
 */

import { type Assessment, type Pflegegrad } from './nba';
import {
  BENEFITS,
  type Benefit,
  type BenefitId,
  type Cents,
  VERHINDERUNGSPFLEGE_BY_RELATIVE,
  benefit,
  monthlyEquivalent,
} from './benefits';
import type { SourceId } from './sources';

/**
 * Benefits that compete for the same entitlement. Only the group's own rule
 * decides what is claimable, never the sum of its members.
 */
export const EXCLUSIVE_GROUPS: Record<string, BenefitId[]> = {
  careProvision: ['pflegegeld', 'pflegesachleistung'],
};

export interface Circumstances {
  /** Care takes place at home rather than in a residential facility. */
  atHome: boolean;
  /** Lives in an assisted shared household (gates Wohngruppenzuschlag). */
  sharedHousehold: boolean;
  /** Home adaptations are wanted or needed (gates Wohnumfeldverbesserung). */
  wantsHomeAdaptation: boolean;
}

export interface CareProfile {
  /** Grade already awarded by the Pflegekasse, or 0 if none. */
  currentGrade: Pflegegrad;
  /** Estimate produced by the intake. */
  assessment: Assessment;
  /** Benefits the household already claims, by id, in cents per that benefit's period. */
  claimed: Partial<Record<BenefitId, Cents>>;
  circumstances: Circumstances;
  /** ISO date of the Pflegegrad decision letter, if there is one. */
  bescheidDate?: string;
}

export type GapStatus =
  /** Claiming the full entitlement. Nothing to do. */
  | 'claimed'
  /** Entitled and claiming nothing, or less than the full amount. */
  | 'unclaimed'
  /** Entitled only if a circumstance holds that we cannot verify from the intake. */
  | 'check'
  /** Not entitled at the current grade. */
  | 'ineligible';

export interface BenefitGap {
  benefit: Benefit;
  status: GapStatus;
  entitled: Cents;
  /**
   * Where `entitled` was reduced by a conservative assumption, the unreduced
   * figure. Present only for the Gemeinsamer Jahresbetrag today. The report
   * shows it as reachable upside, never as part of the headline.
   */
  fullEntitled?: Cents;
  claimed: Cents;
  gap: Cents;
  /** Gap expressed per month; null for one-off grants. */
  monthlyGap: Cents | null;
  source: SourceId;
}

export type ActionKind =
  | 'apply-grade'
  | 'appeal-grade'
  | 'request-upgrade'
  | 'claim-benefit'
  | 'book-advice';

export interface Action {
  kind: ActionKind;
  title: { de: string; en: string };
  why: { de: string; en: string };
  /** Monthly value unlocked, in cents. Null where the value is one-off or indirect. */
  monthlyValue: Cents | null;
  /** One-off value, in cents, where applicable. */
  onceValue: Cents | null;
  effort: 'low' | 'medium' | 'high';
  /** Document template this action can generate, if any. */
  generates?: 'antrag-pflegegrad' | 'widerspruch-pflegegrad' | 'antrag-hoeherstufung';
  /** Hard deadline, ISO date, where one applies. */
  deadline?: string;
  source: SourceId;
}

export interface GapReport {
  /** Grade the household holds today. */
  currentGrade: Pflegegrad;
  /** Grade the intake suggests. */
  estimatedGrade: Pflegegrad;
  /** True where the estimate exceeds the awarded grade. */
  estimateExceedsCurrent: boolean;
  gaps: BenefitGap[];
  /** Sum of certain, recurring, unclaimed money per month. The headline. */
  monthlyGapTotal: Cents;
  /** One-off money left unclaimed, reported separately from the headline. */
  onceGapTotal: Cents;
  /** Benefits whose eligibility depends on unverified circumstances. */
  needsChecking: BenefitGap[];
  actions: Action[];
  disclaimer: { de: string; en: string };
}

/**
 * Entitlement as the headline is allowed to count it.
 *
 * The Gemeinsamer Jahresbetrag pools Verhinderungspflege and Kurzzeitpflege.
 * Where a nahe Angehörige provides the cover, the Verhinderungspflege share is
 * capped at twice the Pflegegeld: 694 € at Pflegegrad 2 against a pooled budget
 * of 3.539 €. That is the ordinary case in a household reached by this tool at
 * all, and the intake does not establish who would stand in, so the headline
 * assumes the relative and counts the capped figure.
 *
 * The full budget is real and stays reachable through Kurzzeitpflege or cover
 * by anyone else. It is carried on the gap row as `fullEntitled` so the report
 * can show it as upside, and the benefit's own caveat states the rule.
 *
 * Counting the full figure would put roughly 295 € a month into a typical
 * headline that the family cannot draw the way they will read it, which is the
 * failure this file exists to avoid.
 */
function headlineEntitlement(
  b: Benefit,
  grade: Pflegegrad,
): { entitled: Cents; full?: Cents } {
  const full = b.amounts[grade];
  if (b.id !== 'gemeinsamerJahresbetrag') return { entitled: full };

  const capped = VERHINDERUNGSPFLEGE_BY_RELATIVE[grade];
  return capped > 0 && capped < full ? { entitled: capped, full } : { entitled: full };
}

/** Does this benefit apply at all, given the household's circumstances? */
function circumstantiallyEligible(b: Benefit, c: Circumstances): boolean | 'unknown' {
  switch (b.id) {
    case 'pflegehilfsmittel':
      return c.atHome;
    case 'wohngruppenzuschlag':
      return c.sharedHousehold ? true : 'unknown';
    case 'wohnumfeldverbesserung':
      return c.wantsHomeAdaptation ? true : 'unknown';
    default:
      return true;
  }
}

/**
 * Entitlement for the care-provision slot.
 *
 * Reported as the Pflegegeld figure, the amount that actually reaches a family
 * providing care themselves. The higher Sachleistung value is real but only
 * realisable as invoiced services, so it belongs in the explanation, not the
 * headline.
 */
function careProvisionEntitlement(grade: Pflegegrad): Cents {
  return benefit('pflegegeld').amounts[grade];
}

function careProvisionClaimed(claimed: CareProfile['claimed']): Cents {
  return (claimed.pflegegeld ?? 0) + (claimed.pflegesachleistung ?? 0);
}

export function analyse(profile: CareProfile): GapReport {
  const { currentGrade, assessment, claimed, circumstances } = profile;
  const estimatedGrade = assessment.grade;

  // Gaps are measured against the grade the household actually holds. Money
  // from a higher estimated grade is not "unclaimed": it is unawarded, and it
  // belongs in the actions as an appeal, not in the headline as cash.
  const grade = currentGrade;

  const groupMembers = new Set(Object.values(EXCLUSIVE_GROUPS).flat());
  const gaps: BenefitGap[] = [];

  for (const b of BENEFITS) {
    if (groupMembers.has(b.id)) continue;

    const eligibility = circumstantiallyEligible(b, circumstances);
    const { entitled, full: fullEntitled } = headlineEntitlement(b, grade);
    const already = claimed[b.id] ?? 0;

    if (entitled <= 0 || eligibility === false) {
      gaps.push({
        benefit: b,
        status: 'ineligible',
        entitled: 0,
        claimed: already,
        gap: 0,
        monthlyGap: null,
        source: b.source,
      });
      continue;
    }

    const gap = Math.max(0, entitled - already);
    const status: GapStatus =
      eligibility === 'unknown' ? 'check' : gap > 0 ? 'unclaimed' : 'claimed';

    gaps.push({
      benefit: b,
      status,
      entitled,
      ...(fullEntitled === undefined ? {} : { fullEntitled }),
      claimed: already,
      gap,
      monthlyGap: gap > 0 ? monthlyEquivalent(b, gap) : 0,
      source: b.source,
    });
  }

  // The care-provision slot, handled once.
  const cpEntitled = careProvisionEntitlement(grade);
  const cpClaimed = careProvisionClaimed(claimed);
  const cpGap = Math.max(0, cpEntitled - cpClaimed);
  if (cpEntitled > 0) {
    gaps.push({
      benefit: benefit('pflegegeld'),
      status: cpGap > 0 ? 'unclaimed' : 'claimed',
      entitled: cpEntitled,
      claimed: cpClaimed,
      gap: cpGap,
      monthlyGap: cpGap,
      source: 'pflegegeld',
    });
  }

  const certain = gaps.filter((g) => g.status === 'unclaimed');

  const monthlyGapTotal = certain.reduce((sum, g) => sum + (g.monthlyGap ?? 0), 0);

  const onceGapTotal = certain
    .filter((g) => g.benefit.period === 'once')
    .reduce((sum, g) => sum + g.gap, 0);

  const needsChecking = gaps.filter((g) => g.status === 'check');

  return {
    currentGrade,
    estimatedGrade,
    estimateExceedsCurrent: estimatedGrade > currentGrade,
    gaps,
    monthlyGapTotal,
    onceGapTotal,
    needsChecking,
    actions: buildActions(profile, certain),
    disclaimer: {
      de:
        'Diese Einschätzung ersetzt keine Begutachtung durch den Medizinischen Dienst ' +
        'und keine Rechtsberatung. Die Pflegeberatung nach § 7a SGB XI ist kostenlos ' +
        'und gesetzlich garantiert.',
      en:
        'This estimate does not replace an assessment by the Medizinischer Dienst, ' +
        'nor legal advice. Statutory care advice under § 7a SGB XI is free and ' +
        'legally guaranteed.',
    },
  };
}

/** One month from the decision letter, per § 84 SGG. */
function appealDeadline(bescheidDate?: string): string | undefined {
  if (!bescheidDate) return undefined;
  const d = new Date(bescheidDate);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function buildActions(profile: CareProfile, certainGaps: BenefitGap[]): Action[] {
  const actions: Action[] = [];
  const { currentGrade, assessment, bescheidDate } = profile;
  const estimated = assessment.grade;

  // No grade at all: this single action unlocks the entire catalogue, so it
  // outranks everything regardless of individual benefit values.
  if (currentGrade === 0 && estimated > 0) {
    const unlocked = benefit('pflegegeld').amounts[estimated];
    actions.push({
      kind: 'apply-grade',
      title: {
        de: `Pflegegrad beantragen: die Einschätzung ergibt Pflegegrad ${estimated}`,
        en: `Apply for a Pflegegrad: the estimate indicates Pflegegrad ${estimated}`,
      },
      why: {
        de: 'Ohne Pflegegrad besteht kein Anspruch auf die übrigen Leistungen. Dieser Antrag schaltet alles Weitere frei.',
        en: 'Without a Pflegegrad none of the other benefits can be claimed. This application unlocks everything else.',
      },
      monthlyValue: unlocked > 0 ? unlocked : benefit('entlastungsbetrag').amounts[estimated],
      onceValue: null,
      effort: 'medium',
      generates: 'antrag-pflegegrad',
      source: 'pflegegeld',
    });
  }

  // Awarded grade sits below the estimate. Within a month of the Bescheid this
  // is an objection; after that it is a fresh request for reassessment.
  if (currentGrade > 0 && estimated > currentGrade) {
    const deadline = appealDeadline(bescheidDate);
    const withinAppealWindow = deadline ? new Date(deadline) >= new Date() : false;
    const uplift =
      benefit('pflegegeld').amounts[estimated] - benefit('pflegegeld').amounts[currentGrade];

    actions.push({
      kind: withinAppealWindow ? 'appeal-grade' : 'request-upgrade',
      title: withinAppealWindow
        ? {
            de: `Widerspruch einlegen: die Einschätzung ergibt Pflegegrad ${estimated}, bewilligt ist ${currentGrade}`,
            en: `Lodge an objection: the estimate indicates Pflegegrad ${estimated}, but ${currentGrade} was awarded`,
          }
        : {
            de: `Höherstufung beantragen: die Einschätzung ergibt Pflegegrad ${estimated}`,
            en: `Request a reassessment: the estimate indicates Pflegegrad ${estimated}`,
          },
      why: {
        de: 'Von 100 Gutachten, die nach einem Widerspruch noch einmal geprüft wurden, wurden 2022 rund 29 geändert. Eine begründete Einwendung lohnt sich deutlich öfter als eine unbegründete.',
        en: 'Of every 100 reports re-examined after an objection, around 29 were changed in 2022. A reasoned objection succeeds far more often than an unreasoned one.',
      },
      monthlyValue: uplift > 0 ? uplift : null,
      onceValue: null,
      effort: 'medium',
      generates: withinAppealWindow ? 'widerspruch-pflegegrad' : 'antrag-hoeherstufung',
      deadline: withinAppealWindow ? deadline : undefined,
      source: withinAppealWindow ? 'widerspruch' : 'pflegegeld',
    });
  }

  // Money already awarded but never drawn. Ranked by monthly value.
  for (const g of certainGaps) {
    if (g.benefit.id === 'pflegegeld') continue; // covered by the grade actions above
    actions.push({
      kind: 'claim-benefit',
      title: {
        de: `${g.benefit.name.de} nutzen`,
        en: `Claim ${g.benefit.name.en}`,
      },
      why: g.benefit.what,
      monthlyValue: g.benefit.period === 'once' ? null : g.monthlyGap,
      onceValue: g.benefit.period === 'once' ? g.gap : null,
      effort: 'low',
      source: g.source,
    });
  }

  // Always offered, never ranked first. Costs the family nothing and is the
  // fastest way for this tool to earn trust with community organisations.
  actions.push({
    kind: 'book-advice',
    title: {
      de: 'Kostenlose Pflegeberatung nach § 7a SGB XI anfordern',
      en: 'Request free statutory care advice under § 7a SGB XI',
    },
    why: {
      de: 'Ein gesetzlicher Anspruch. Die Pflegekasse muss innerhalb von zwei Wochen einen Termin anbieten.',
      en: 'A legal entitlement. The insurer must offer an appointment within two weeks.',
    },
    monthlyValue: null,
    onceValue: null,
    effort: 'low',
    source: 'pflegeberatung',
  });

  const rank: Record<ActionKind, number> = {
    'apply-grade': 0,
    'appeal-grade': 1,
    'request-upgrade': 2,
    'claim-benefit': 3,
    'book-advice': 4,
  };

  return actions.sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
    return (b.monthlyValue ?? 0) - (a.monthlyValue ?? 0);
  });
}

/** Convenience for the headline line of the report. */
export function headline(report: GapReport): { monthly: Cents; annual: Cents } {
  return {
    monthly: report.monthlyGapTotal,
    annual: report.monthlyGapTotal * 12,
  };
}
