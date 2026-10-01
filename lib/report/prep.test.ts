import { describe, it, expect } from 'vitest';
import { assess } from '../rules/nba';
import { analyse, type CareProfile } from '../rules/gap';
import { UI } from '../i18n/strings';
import { PREP_TIPS, assessmentAhead } from './prep';

const home = { atHome: true, sharedHousehold: false, wantsHomeAdaptation: false };
const profile = (over: Partial<CareProfile>): CareProfile => ({
  currentGrade: 2,
  assessment: assess({ m1: 6, m2: 11, m3: 0, m4: 19, m5: 4, m6: 7 }),
  claimed: {},
  circumstances: home,
  ...over,
});

describe('the assessment checklist', () => {
  it('is shown when a step leads to an assessment', () => {
    expect(assessmentAhead(analyse(profile({})))).toBe(true);
    expect(assessmentAhead(analyse(profile({ currentGrade: 0 })))).toBe(true);
  });

  it('is not shown when no assessment is coming', () => {
    // Estimate at or below the grade held: no application, no objection.
    expect(assessmentAhead(analyse(profile({ currentGrade: 5 })))).toBe(false);
  });

  it('has every tip in every interface language', () => {
    for (const k of PREP_TIPS) {
      for (const lang of ['de', 'en', 'tr', 'ru', 'pl', 'ar'] as const) {
        expect(UI[k][lang].length).toBeGreaterThan(10);
      }
    }
  });
});
