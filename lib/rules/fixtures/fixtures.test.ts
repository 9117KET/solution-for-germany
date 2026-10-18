import { describe, it, expect } from 'vitest';
import { assessIntake, emptyIntake, type IntakeAnswers } from '../../intake/score';
import { GUTACHTEN_CASES } from './cases';

function answersFor(c: (typeof GUTACHTEN_CASES)[number]): IntakeAnswers {
  return {
    ...emptyIntake(),
    conditions: { ...c.conditions },
    levels: { ...c.levels },
    m5: c.m5 ? { ...c.m5 } : undefined,
    dietLevel: c.dietLevel,
  };
}

describe('recorded assessments', () => {
  it('keeps every case traceable to a source somebody can re-check', () => {
    for (const c of GUTACHTEN_CASES) {
      expect(c.source, `${c.id} has no source`).toBeTruthy();
      expect(c.checkedOn, `${c.id} has no check date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it.each(GUTACHTEN_CASES.map((c) => [c.id, c] as const))(
    'reproduces %s',
    (_id, c) => {
      const { assessment } = assessIntake(answersFor(c));

      expect(
        assessment.grade,
        `${c.id} (${c.source}) expected Pflegegrad ${c.expect.grade}, got ${assessment.grade}`,
      ).toBe(c.expect.grade);

      for (const [m, points] of Object.entries(c.expect.modules ?? {})) {
        const got = assessment.modules.find((x) => x.id === m);
        expect(got?.raw, `${c.id}: module ${m}`).toBe(points);
      }

      if (c.expect.totalWeighted !== undefined) {
        expect(assessment.totalWeighted, `${c.id}: weighted total`).toBe(c.expect.totalWeighted);
      }
    },
  );

  // Visible in every test run until someone does it. See cases.ts for where
  // these come from; the pilot is the likeliest source of the first few.
  it.todo('reproduces at least one worked example from the Begutachtungs-Richtlinien');
  it.todo('reproduces at least one published VdK or BIVA objection case');
  it.todo('reproduces at least three Bescheide from pilot households');
});
