# Architecture: Anspruch

Date: 2026-11-25 · Status: **proposed**, awaiting the human's approval · Tier: Project

*This is the record of how the platform is built and why. It is written before the code
(spec-driven). The decisions that outlive a single feature each have an ADR in `docs/adr/`.
It is the plan for building the platform **whether or not the Prototype Fund selects the
application** (`docs/dossier/antrag/j03_antrag_live.md`); the grant, if it comes, funds work that
is already planned here.*

## 1. What the platform is

Two things in one repository:

1. **The Anspruch website** (exists): a questionnaire for families that estimates the Pflegegrad,
   compares benefits and produces a PDF. Next.js 16.4.2, React 19.2.8, statically prerendered, no
   server code, no database, no accounts; answers stay in the browser. Live on Vercel. Licence
   EUPL-1.2.
2. **The instrument engine** (to build): a TypeScript library that scores a points-and-threshold
   assessment and stops asking once the result is decided. The German care assessment is the first
   instrument. Anspruch becomes its first user. It is published to npm as an open-source package.

## 2. Where we start (facts, 25.11.2026)

- `lib/intake/adaptive.ts` (474 lines) computes the grade twice, with every unanswered question at
  its best and its worst, and stops asking when both bounds agree. It is sound because the
  assessment is monotonic (documented in the file header).
- `lib/rules/nba.ts` holds the six modules, their bracket tables and the grade thresholds as
  TypeScript constants. `lib/intake/criteria.ts` (656 lines), `groups.ts`, `score.ts`, `m5-bands.ts`
  hold the criteria and the module 5 pooling. All of it is **care-specific and imported directly by
  the website**: that is what "locked inside the website" means.
- 362 tests pass across 10 files (`npm test`, run 25.11.2026). CI (`.github/workflows/ci.yml`)
  runs install, dependency audit, lint, typecheck, unit tests, build and Playwright end-to-end tests
  in three engines. Nothing in CI is `continue-on-error`.
- No `docs/adr/` and no `ARCHITECTURE.md` existed before this file.

## 3. Target shape

```
repo root (npm workspaces)
├── app/, components/, lib/ ...      the Anspruch website (unchanged behaviour)
├── packages/
│   └── engine/                      the instrument engine (name to decide, see §7)
│       ├── src/                     generic code only: no German law, no React, no Next
│       ├── test/                    unit tests, golden files, property tests
│       └── instruments/             data: care assessment 2026, later the PNOG set
└── docs/ (ARCHITECTURE.md, adr/, features/)
```

Rules the code must keep true (checked by tests or lint where possible):

1. **`packages/engine` imports nothing from the website** and has **no runtime dependencies**.
2. The engine runs in the browser and in Node, and does no network or file access when evaluating.
3. An instrument is **data** (JSON), validated at load time; the engine contains no law-specific
   constants (ADR 0002).
4. The website consumes the engine only through its public exports, from the workspace, and the
   existing 362 tests plus the end-to-end suite must pass unchanged on the website's side.
5. Every number in an instrument file traces to a cited source (statute section and the date the
   text was read); changing one is a reviewed change.

## 4. Decisions (ADRs)

| ADR | Decision | Status |
| --- | --- | --- |
| 0001 | Same repository, npm workspaces, the library in `packages/` | proposed |
| 0002 | Instruments are JSON data with a hand-written runtime validator | proposed |
| 0003 | Characterization first: pin today's behaviour, then extract without changing output | proposed |

## 5. Slices (each gets its own record in `docs/features/`, built and verified in order)

| # | Slice | Done when |
| --- | --- | --- |
| S1 | **Characterization tests** (`docs/features/2026-11-25-engine-characterization.md`) | A golden file of today's engine results is committed and CI fails if any result changes |
| S2 | **Workspace and extraction**: move the generic evaluator into `packages/engine`; the care assessment is expressed as an instrument; the website runs on the package | Golden results identical; 362 tests and e2e green; website bundle no larger than today |
| S3 | **Data format, validator, monotonicity checker** | A malformed or non-monotonic instrument is rejected with a precise message; property tests pass |
| S4 | **Dated rule sets**: 2026 rules and the planned PNOG reform, side by side | The engine selects the set by date; both sets pass the golden results for their date. The PNOG set is marked as draft until it is law |
| S5 | **Official-text comparison script** | The script reads Anlage 1 and 2 to § 15 SGB XI from gesetze-im-internet.de and reports differences against the instrument; its output is checked in a test against a saved copy |
| S6 | **Docs and examples**: README, API reference, a second small instrument as an example | A developer who has never seen the stop rule can score an instrument from the README alone |
| S7 | **npm release** (publish path, human gate) | A tagged release is published with provenance by the pipeline, after the human's yes |

No dates: slices ship when done and verified (the human's decision, 25.11.2026). The order is the
dependency order; S5 and S6 can swap.

## 6. Cross-cutting rules (apply to every slice)

- **Tests at every layer** (`/sdlc` Stage 3): unit, integration (the website consuming the package),
  end-to-end (existing Playwright suite), performance (budgets in §8), and the refusal tests below.
- **Security** (`/secure`): the engine handles no personal data, but it is a published package and
  it reads untrusted instrument files. See the feature records' security blocks. The publish path
  (S7) is a deploy path: its `CD` checks are run and recorded before the first release.
- **Branches**: one `feat/…` or `chore/…` branch per slice, cut from `main` (the repo has no `dev`),
  pull request into `main`, merge only on the human's yes; CI green first. No push to `main`.
- **Claims**: the application says the engine has "no runtime dependencies" and "identical results".
  Both are tested claims (CI step and golden file), not intentions.

## 7. Open decisions (the human's)

| Question | Why it matters | Recommendation |
| --- | --- | --- |
| Package name and npm scope | Published names are permanent in practice. Availability is **not checked** | Check `npm view <name>` before choosing; prefer a scoped name |
| Does the care instrument ship inside the engine package or as a second package? | A second package keeps the engine free of German law | Start inside the repo as data under `packages/engine/instruments/`, split only if a second user needs it |
| Licence of the package | The website is EUPL-1.2; the application says the library is released under EUPL-1.2 | Keep EUPL-1.2 for consistency with the application; note that it is a strong copyleft licence that some companies avoid, and revisit with the first outside user |
| Whether the PNOG reform set ships before the law passes | A wrong threshold would mislead users | Ship it marked "draft, not law" and keep it out of the website until the law passes |

## 8. Performance budgets

None are recorded in `CLAUDE.md`. First budget, proposed ("no worse than today", to be measured in
S1 and confirmed by the human): website bundle size and time to answer a full intake of the care
assessment at its current figures; engine: `gradeBounds` for a full care-assessment answer set,
measured in a vitest bench and recorded in S1. Targets beyond "no worse than today" are the human's
to set.

## 9. Sources

Docs read for this plan: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md`
and `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md` (Next 16.4.2, the workspace
consumption path, to be re-read in S2 before the wiring is written, per `AGENTS.md`). Code read:
`lib/intake/adaptive.ts`, `lib/intake/score.ts`, `lib/rules/nba.ts`, `.github/workflows/ci.yml`,
`docs/ENGINEERING_BASELINE.md`.
