import { describe, it, expect } from 'vitest';
import {
  assess,
  gradeForPoints,
  MODULES,
  type Pflegegrad,
  type RawScores,
  type ModuleId,
} from './nba';
import {
  BENEFITS,
  entitlement,
  kombinationsleistung,
  euro,
  formatEuro,
  monthlyEquivalent,
  benefit,
  VERHINDERUNGSPFLEGE_BY_RELATIVE,
} from './benefits';
import { analyse, type CareProfile, type Circumstances } from './gap';
import { SOURCES } from './sources';

const zero: RawScores = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0 };
const raw = (p: Partial<RawScores>): RawScores => ({ ...zero, ...p });

const atHomeOnly: Circumstances = {
  atHome: true,
  sharedHousehold: false,
  wantsHomeAdaptation: false,
};

describe('NBA point conversion tables', () => {
  it('sums to exactly 100 when every module is at its maximum raw score', () => {
    // The strongest available check that the tables were transcribed correctly:
    // the official weightings are defined to total 100.
    const max = Object.fromEntries(
      (Object.keys(MODULES) as ModuleId[]).map((id) => [id, MODULES[id].maxRaw]),
    ) as RawScores;

    const result = assess(max);
    expect(result.totalWeighted).toBe(100);
    expect(result.grade).toBe(5);
  });

  it('each module’s brackets are contiguous from 0 to its maximum raw score', () => {
    for (const spec of Object.values(MODULES)) {
      expect(spec.brackets[0].from).toBe(0);
      expect(spec.brackets[spec.brackets.length - 1].to).toBe(spec.maxRaw);
      for (let i = 1; i < spec.brackets.length; i++) {
        expect(spec.brackets[i].from).toBe(spec.brackets[i - 1].to + 1);
      }
    }
  });

  it('each module’s top bracket equals its declared share of the 100 points', () => {
    for (const spec of Object.values(MODULES)) {
      const top = spec.brackets[spec.brackets.length - 1];
      expect(top.weighted).toBe(spec.maxWeighted);
    }
  });

  it('returns no grade for an unimpaired profile', () => {
    const result = assess(zero);
    expect(result.totalWeighted).toBe(0);
    expect(result.grade).toBe(0);
  });
});

describe('grade thresholds', () => {
  it.each([
    [0, 0],
    [12.49, 0],
    [12.5, 1],
    [26.99, 1],
    [27, 2],
    [47.49, 2],
    [47.5, 3],
    [69.99, 3],
    [70, 4],
    [89.99, 4],
    [90, 5],
    [100, 5],
  ])('%s weighted points -> Pflegegrad %s', (points, grade) => {
    expect(gradeForPoints(points)).toBe(grade);
  });

  it('reports the distance to the next grade, and null at grade 5', () => {
    // m1=2 -> 2.5, m2=2 -> 3.75, m4=3 -> 10, m5=1 -> 5, m6=1 -> 3.75  = 25.0
    const mild = assess(raw({ m1: 2, m2: 2, m4: 3, m5: 1, m6: 1 }));
    expect(mild.totalWeighted).toBe(25);
    expect(mild.grade).toBe(1);
    expect(mild.nextGrade).toBe(2);
    expect(mild.pointsToNextGrade).toBe(2);

    const max = assess(
      Object.fromEntries(
        (Object.keys(MODULES) as ModuleId[]).map((id) => [id, MODULES[id].maxRaw]),
      ) as RawScores,
    );
    expect(max.pointsToNextGrade).toBeNull();
    expect(max.nextGrade).toBeNull();
  });
});

describe('modules 2 and 3 share one 15-point allocation', () => {
  it('counts only the higher of the two', () => {
    // m2 raw 2 -> 3.75; m3 raw 7 -> 15. Only m3 should count.
    const result = assess(raw({ m2: 2, m3: 7 }));
    expect(result.totalWeighted).toBe(15);

    const m2 = result.modules.find((m) => m.id === 'm2')!;
    const m3 = result.modules.find((m) => m.id === 'm3')!;
    expect(m3.counted).toBe(true);
    expect(m2.counted).toBe(false);
    // The losing module keeps its score so the UI can explain why it dropped out.
    expect(m2.weighted).toBe(3.75);
  });

  it('never lets the two sum together', () => {
    const both = assess(raw({ m2: 33, m3: 65 }));
    expect(both.totalWeighted).toBe(15);
    expect(both.totalWeighted).not.toBe(30);
  });

  it('resolves a tie in favour of the cognition module', () => {
    const tied = assess(raw({ m2: 17, m3: 7 })); // both map to 15
    expect(tied.modules.find((m) => m.id === 'm2')!.counted).toBe(true);
    expect(tied.modules.find((m) => m.id === 'm3')!.counted).toBe(false);
  });
});

describe('raw score handling', () => {
  it('clamps scores above a module maximum instead of inflating them', () => {
    const result = assess(raw({ m4: 999 }));
    expect(result.modules.find((m) => m.id === 'm4')!.raw).toBe(MODULES.m4.maxRaw);
    expect(result.modules.find((m) => m.id === 'm4')!.weighted).toBe(40);
  });

  it('rejects negative and non-finite scores loudly', () => {
    expect(() => assess(raw({ m1: -1 }))).toThrow(/must not be negative/);
    expect(() => assess(raw({ m1: NaN }))).toThrow(/finite number/);
  });
});

describe('benefit catalogue', () => {
  it('matches the published 2026 amounts', () => {
    expect(entitlement('pflegegeld', 2)).toBe(euro(347));
    expect(entitlement('pflegegeld', 3)).toBe(euro(599));
    expect(entitlement('pflegegeld', 4)).toBe(euro(800));
    expect(entitlement('pflegegeld', 5)).toBe(euro(990));

    expect(entitlement('pflegesachleistung', 2)).toBe(euro(796));
    expect(entitlement('pflegesachleistung', 3)).toBe(euro(1497));
    expect(entitlement('pflegesachleistung', 4)).toBe(euro(1859));
    expect(entitlement('pflegesachleistung', 5)).toBe(euro(2299));

    expect(entitlement('gemeinsamerJahresbetrag', 2)).toBe(euro(3539));
    expect(entitlement('wohnumfeldverbesserung', 1)).toBe(euro(4180));
    expect(entitlement('wohngruppenzuschlag', 3)).toBe(euro(224));
  });

  it('grants the relief allowance and consumables from Pflegegrad 1', () => {
    expect(entitlement('entlastungsbetrag', 1)).toBe(euro(131));
    expect(entitlement('pflegehilfsmittel', 1)).toBe(euro(42));
    // ...but the care allowance only from Pflegegrad 2.
    expect(entitlement('pflegegeld', 1)).toBe(0);
    expect(entitlement('gemeinsamerJahresbetrag', 1)).toBe(0);
  });

  it('pays nothing at all without a Pflegegrad', () => {
    for (const b of BENEFITS) {
      expect(b.amounts[0]).toBe(0);
    }
  });

  it('carries a resolvable source for every benefit', () => {
    for (const b of BENEFITS) {
      expect(SOURCES[b.source]).toBeDefined();
      expect(SOURCES[b.source].law).toMatch(/§/);
    }
  });

  it('never annualises a one-off grant', () => {
    const once = benefit('wohnumfeldverbesserung');
    expect(monthlyEquivalent(once, euro(4180))).toBeNull();
  });
});

describe('Kombinationsleistung (§ 38 SGB XI)', () => {
  it('reduces the care allowance by the share of services used', () => {
    const half = kombinationsleistung(3, euro(748.5)); // half of 1497
    expect(half.sachleistungShare).toBeCloseTo(0.5, 5);
    expect(half.pflegegeld).toBe(euro(299.5));
  });

  it('pays the full allowance when no services are used', () => {
    expect(kombinationsleistung(3, 0).pflegegeld).toBe(euro(599));
  });

  it('pays nothing when services are fully exhausted, and does not go negative', () => {
    expect(kombinationsleistung(3, euro(1497)).pflegegeld).toBe(0);
    expect(kombinationsleistung(3, euro(99999)).pflegegeld).toBe(0);
  });
});

describe('gap analysis', () => {
  const profile = (over: Partial<CareProfile> = {}): CareProfile => ({
    currentGrade: 3,
    assessment: assess(raw({ m1: 4, m2: 6, m4: 8, m5: 2, m6: 4 })),
    claimed: { pflegegeld: euro(599) },
    circumstances: atHomeOnly,
    ...over,
  });

  it('does NOT add Pflegegeld and Pflegesachleistung together', () => {
    const report = analyse(profile());

    // The failure mode this guards against: reporting the untouched €1,497
    // Sachleistung as an unclaimed gap on top of the €599 already received.
    expect(report.monthlyGapTotal).toBeLessThan(euro(1497));

    const sachGap = report.gaps.find((g) => g.benefit.id === 'pflegesachleistung');
    expect(sachGap).toBeUndefined();

    const careSlot = report.gaps.find((g) => g.benefit.id === 'pflegegeld')!;
    expect(careSlot.status).toBe('claimed');
    expect(careSlot.gap).toBe(0);
  });

  it('totals only certain, recurring, unclaimed money', () => {
    const report = analyse(profile());

    // Entlastungsbetrag 131 + Pflegehilfsmittel 42 + Jahresbetrag 3539/12.
    const expected = euro(131) + euro(42) + Math.round(euro(3539) / 12);
    expect(report.monthlyGapTotal).toBe(expected);
    expect(formatEuro(report.monthlyGapTotal)).toContain('467');
  });

  it('holds conditional benefits back for checking rather than counting them', () => {
    const report = analyse(profile());
    const ids = report.needsChecking.map((g) => g.benefit.id);
    expect(ids).toContain('wohnumfeldverbesserung');
    expect(ids).toContain('wohngruppenzuschlag');

    // €4,180 must not have leaked into the monthly headline.
    expect(report.monthlyGapTotal).toBeLessThan(euro(1000));
  });

  it('excludes consumables when care is not provided at home', () => {
    const report = analyse(
      profile({ circumstances: { ...atHomeOnly, atHome: false } }),
    );
    const aids = report.gaps.find((g) => g.benefit.id === 'pflegehilfsmittel')!;
    expect(aids.status).toBe('ineligible');
    expect(aids.gap).toBe(0);
  });

  it('ranks applying for a Pflegegrad above everything when there is none', () => {
    const report = analyse(
      profile({ currentGrade: 0, claimed: {} }),
    );
    expect(report.actions[0].kind).toBe('apply-grade');
    expect(report.actions[0].generates).toBe('antrag-pflegegrad');
    // Nothing is claimable without a grade, so there is no cash gap to report.
    expect(report.monthlyGapTotal).toBe(0);
  });

  it('offers an objection while the one-month deadline is open', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const report = analyse(
      profile({
        currentGrade: 2,
        assessment: assess(raw({ m1: 6, m2: 11, m4: 19, m5: 4, m6: 7 })),
        bescheidDate: tenDaysAgo.toISOString().slice(0, 10),
      }),
    );

    const appeal = report.actions.find((a) => a.kind === 'appeal-grade');
    expect(appeal).toBeDefined();
    expect(appeal!.generates).toBe('widerspruch-pflegegrad');
    expect(appeal!.deadline).toBeDefined();
    expect(report.estimateExceedsCurrent).toBe(true);
  });

  it('falls back to a reassessment request once the deadline has passed', () => {
    const longAgo = new Date();
    longAgo.setFullYear(longAgo.getFullYear() - 1);

    const report = analyse(
      profile({
        currentGrade: 2,
        assessment: assess(raw({ m1: 6, m2: 11, m4: 19, m5: 4, m6: 7 })),
        bescheidDate: longAgo.toISOString().slice(0, 10),
      }),
    );

    expect(report.actions.find((a) => a.kind === 'appeal-grade')).toBeUndefined();
    const upgrade = report.actions.find((a) => a.kind === 'request-upgrade')!;
    expect(upgrade.generates).toBe('antrag-hoeherstufung');
    expect(upgrade.deadline).toBeUndefined();
  });

  it('does not treat an unawarded higher grade as unclaimed cash', () => {
    const report = analyse(
      profile({
        currentGrade: 2,
        claimed: { pflegegeld: euro(347) },
        assessment: assess(raw({ m1: 10, m2: 17, m4: 37, m5: 6, m6: 12 })), // grade 5
      }),
    );
    expect(report.estimatedGrade).toBe(5);
    // Gaps are measured against grade 2, not the estimate.
    const careSlot = report.gaps.find((g) => g.benefit.id === 'pflegegeld')!;
    expect(careSlot.entitled).toBe(euro(347));
    expect(careSlot.status).toBe('claimed');
  });

  it('always offers the free statutory advice, and never ranks it first', () => {
    const report = analyse(profile());
    const advice = report.actions.find((a) => a.kind === 'book-advice');
    expect(advice).toBeDefined();
    expect(report.actions[report.actions.length - 1].kind).toBe('book-advice');
  });

  it('states plainly that it is not an assessment or legal advice', () => {
    const report = analyse(profile());
    expect(report.disclaimer.de).toMatch(/Medizinischen Dienst/);
    expect(report.disclaimer.de).toMatch(/§ 7a SGB XI/);
    expect(report.disclaimer.en).toMatch(/does not replace/);
  });
});

describe('Verhinderungspflege when a relative provides the cover', () => {
  it('is capped at exactly twice the Pflegegeld', () => {
    // Not a coincidence to be re-typed if Pflegegeld changes: § 39 SGB XI
    // defines the cap as double, so the test asserts the relationship.
    for (const grade of [2, 3, 4, 5] as Pflegegrad[]) {
      expect(VERHINDERUNGSPFLEGE_BY_RELATIVE[grade]).toBe(
        entitlement('pflegegeld', grade) * 2,
      );
    }
  });

  it('is far below the pooled annual budget, which is the point', () => {
    // A household whose stand-in is a family member — the common case — cannot
    // reach 3.539 € on Verhinderungspflege alone. Showing the pooled figure
    // without this caveat would overstate, which is the one failure mode this
    // product is built to avoid.
    for (const grade of [2, 3, 4, 5] as Pflegegrad[]) {
      expect(VERHINDERUNGSPFLEGE_BY_RELATIVE[grade]).toBeLessThan(
        entitlement('gemeinsamerJahresbetrag', grade),
      );
    }
    expect(VERHINDERUNGSPFLEGE_BY_RELATIVE[2]).toBe(euro(694));
    expect(VERHINDERUNGSPFLEGE_BY_RELATIVE[5]).toBe(euro(1980));
  });

  it('says so in both languages wherever the benefit is shown', () => {
    const caveat = benefit('gemeinsamerJahresbetrag').caveat!;
    expect(caveat.de).toContain('694');
    expect(caveat.en).toContain('694');
    expect(caveat.de).toMatch(/nahe Angehörige/);
    expect(caveat.en).toMatch(/close relative/);
  });
});
