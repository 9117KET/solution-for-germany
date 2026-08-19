/**
 * Provenance registry.
 *
 * Every euro figure and every threshold this product states to a user must
 * carry a `SourceId`. If a number cannot be traced to an entry here, it does
 * not get shown. The model never produces figures; it only reads these.
 *
 * `checkedOn` is the date a human last verified the value against the source.
 * `supersededBy` marks values we know are scheduled to change.
 */

export interface Source {
  /** Statutory basis, as cited to the user. */
  law: string;
  /** Plain-language description of what the source establishes. */
  covers: string;
  /** Where the value was verified. */
  url: string;
  /** ISO date the value was last checked against the source. */
  checkedOn: string;
  /** ISO date from which the value applies. */
  validFrom: string;
  /** Known scheduled change, if any. */
  note?: string;
}

export const SOURCES = {
  pflegegeld: {
    law: '§ 37 SGB XI',
    covers: 'Pflegegeld — cash benefit paid when care is provided privately',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__37.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
    note:
      'No increase for 2026 (Nullrunde). Values are the 1 Jan 2025 amounts ' +
      'after the 4.5% uprating. Next scheduled increase: 1 Jan 2028.',
  },
  pflegesachleistung: {
    law: '§ 36 SGB XI',
    covers: 'Pflegesachleistung — value of professional home-care services',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__36.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
    note: 'No increase for 2026 (Nullrunde).',
  },
  entlastungsbetrag: {
    law: '§ 45b SGB XI',
    covers:
      'Entlastungsbetrag — monthly allowance for relief services, available ' +
      'from Pflegegrad 1. Reimburses approved services; never paid as cash.',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__45b.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
  },
  pflegehilfsmittel: {
    law: '§ 40 Abs. 2 SGB XI',
    covers: 'Pflegehilfsmittel zum Verbrauch — monthly allowance for consumable care aids',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__40.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
    note:
      'Reform proposals would fold this into a broader Entlastungsbudget. ' +
      'Not enacted as of Aug 2026 — recheck before each release.',
  },
  gemeinsamerJahresbetrag: {
    law: '§ 42a SGB XI',
    covers:
      'Gemeinsamer Jahresbetrag — pooled annual budget merging Verhinderungspflege ' +
      'and Kurzzeitpflege. Replaced the two separate budgets on 1 July 2025.',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__42a.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-07-01',
    note:
      'Verhinderungspflege extended from 6 to 8 weeks (56 days). The former ' +
      '6-month qualifying period (Vorpflegezeit) was abolished entirely — a ' +
      'common reason families wrongly believe they are not yet eligible.',
  },
  wohnumfeldverbesserung: {
    law: '§ 40 Abs. 4 SGB XI',
    covers:
      'Wohnumfeldverbessernde Maßnahmen — one-off grant per measure for home ' +
      'adaptation. Available from Pflegegrad 1.',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__40.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
    note:
      'Payable per measure, not per year. Where several eligible people share ' +
      'a household, up to four claims may be pooled for the same measure.',
  },
  wohngruppenzuschlag: {
    law: '§ 38a SGB XI',
    covers: 'Wohngruppenzuschlag — monthly supplement for members of a shared care household',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__38a.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
  },
  kombinationsleistung: {
    law: '§ 38 SGB XI',
    covers:
      'Kombinationsleistung — where professional services are used at less than ' +
      'their full value, Pflegegeld is paid pro rata for the unused share.',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__38.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
  },
  nbaAssessment: {
    law: '§ 15 SGB XI',
    covers:
      'Determination of the Pflegegrad from the six assessment modules, their ' +
      'weightings, and the raw-to-weighted point conversion.',
    url: 'https://www.aok.de/gp/pflegebeduerftigkeit/begutachtungsinstrument/pflegegrades',
    checkedOn: '2026-08-18',
    validFrom: '2017-01-01',
  },
  pflegeberatung: {
    law: '§ 7a SGB XI',
    covers:
      'Free statutory care advice. A legal entitlement — the insurer must offer ' +
      'an appointment within two weeks of a request.',
    url: 'https://www.gesetze-im-internet.de/sgb_11/__7a.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
  },
  widerspruch: {
    law: '§ 84 SGG',
    covers:
      'One month to lodge an objection against a Pflegegrad decision, running ' +
      'from notification of the Bescheid.',
    url: 'https://www.gesetze-im-internet.de/sgg/__84.html',
    checkedOn: '2026-08-18',
    validFrom: '2025-01-01',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

/** Resolve a SourceId to its record. Throws on an unknown id so typos fail loudly. */
export function source(id: SourceId): Source {
  const s = SOURCES[id];
  if (!s) throw new Error(`Unknown source id: ${id}`);
  return s;
}

/**
 * The oldest `checkedOn` across all sources. Surfaced in the UI so a user can
 * see how fresh the ruleset is, and so a stale ruleset is visible rather than
 * silent.
 */
export function rulesetLastChecked(): string {
  return Object.values(SOURCES)
    .map((s) => s.checkedOn)
    .sort()[0];
}
