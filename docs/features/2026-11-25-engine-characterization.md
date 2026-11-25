# Engine characterization: pin today's results before extracting the engine

Date: 2026-11-25 · Tier: Project slice S1 (`docs/ARCHITECTURE.md` §5) · Branch: `feat/engine-characterization`, to be cut from `main` after the human's yes · Status: **design, awaiting approval**

## 1. Brief

- **Who and what problem:** Kinlo, and every family who uses the website, and later every developer who builds on the engine. The engine will be moved out of the website (S2). If any result changes silently during that move, a family sees a wrong Pflegegrad estimate, and the claim "results identical to today's website" is false.
- **What they do today:** The 362 tests check behaviour case by case, but nothing records the engine's results over a wide range of answer sets, so a refactor could drift where no test looks.
- **What changes for them:** Nothing visible. A committed golden file records what the engine returns today for many answer sets, and CI fails if any of it changes.
- **Business rule, in plain words:** For a given set of answers, the engine's grade bounds, its decision on whether more questions can change the outcome, its display state, its next askable question and its final grade must not change unless a human approves a change to the golden file with a stated reason.
- **Out of scope:** Moving any code (S2); changing any result; the data format (S3); new instruments; the website's look.
- **Who must not be able to do this:** Not applicable: the engine has no accounts, roles or server. The abuse concern here is a change that quietly alters results; the control is that the golden file cannot change inside a refactor commit (ADR 0003).

### Acceptance criteria

- [ ] AC1: A generator script builds a set of synthetic answer sets covering every module, all five grade thresholds (each threshold reached from below and above), module 2 versus module 3 pooling, the module 5 bands, the screening gates, and empty and fully answered intakes. Answers are invented; no real person's data is used.
- [ ] AC2: For each answer set the golden file records, from the current code: `gradeBounds`, `canChangeOutcome` and `estimateDisplay`, the remaining askables in order, `progressOf`, `coverageOf`, and the final `assess` result for the fully answered form.
- [ ] AC3: The golden file is committed with the commit hash of the code it was generated from, and a test fails with a readable diff if the engine's output for any recorded answer set differs.
- [ ] AC4: The test runs in `npm test` and therefore in CI on every pull request, in no more than 2 seconds.
- [ ] AC5: Changing one bracket value in `lib/rules/nba.ts` (a sanity check done by hand, not committed) makes the golden test fail, which shows the test can detect drift.
- [ ] AC6: A documented rule says the golden file may change only in a pull request that states why and is approved by the human.
- [ ] AC7: The existing 362 tests still pass unchanged; no engine code is modified in this slice.

### Decisions the human made
| Question | Answer | Date |
|---|---|---|
| Where does the library live? | Same repo, npm workspaces (ADR 0001) | 2026-11-25 |
| How is an instrument described? | JSON data with a runtime validator (ADR 0002) | 2026-11-25 |
| First slice? | Characterization tests, then extract (ADR 0003) | 2026-11-25 |
| Timeline? | Build now, own pace, no dates | 2026-11-25 |

### Assumptions (not yet confirmed)
- The engine functions are deterministic and pure for the same inputs (read from the code headers; to be shown by running the generator twice and comparing).
- Number of answer sets: a few hundred is enough to cover the thresholds and pooling cases. The exact number is a design detail, chosen to keep the run under 2 seconds.
- A property-based approach (random answer sets from a seeded generator) is acceptable in addition to hand-picked boundary cases, as long as the seed is fixed so the golden file is reproducible.

## 2. Design

- **Stack and fit:** vitest (already installed, 4.1.12) and TypeScript. The generator and the test live next to the existing intake tests, for example `lib/intake/golden/` (generator script, `golden.json`, `golden.test.ts`). They import the same public functions the website uses: `gradeBounds`, `canChangeOutcome`, `estimateDisplay`, `remainingAskables`, `progressOf`, `coverageOf` from `lib/intake/adaptive.ts` and `assess` from `lib/rules/nba.ts`. No new runtime or dev dependency.
- **Docs read:** `lib/intake/adaptive.ts`, `lib/intake/score.ts`, `lib/rules/nba.ts` (25.11.2026); vitest config in the repo. Vitest API for snapshots or JSON comparison is to be read from the installed version (`node_modules/vitest`, 4.1.12) at build time, not from memory.
- **Data:** One JSON file, `golden.json`: an array of `{ id, description, answers, expected }`, plus a header with the source commit hash and generator seed. No database, no migration. Rollback: delete the folder.
- **Flow:** `npm run golden:generate` (a script, run only by a human on purpose) writes `golden.json` from the current code. `golden.test.ts` loads the file and compares live output to it with a deep-equal that prints the first differing answer set and field.
- **Failure:** a missing or malformed `golden.json` fails the test with a message saying how to regenerate. A non-deterministic function (same input, different output) is a finding that blocks the slice. A golden file larger than 1 MB is a signal to reduce the number of cases.
- **Security (`/secure`):**
  - Flags raised: none of rows 1 to 10 (no table, endpoint, page, auth, payment, webhook, paid call or secret). The slice adds only test code and a JSON file. Doors D1 to D7 run on the touched files and the secrets scan runs, per the Patch-level minimum.
  - Access matrix rows: none added (no resources).
  - Abuse cases and control: a silent change to results, controlled by the golden test in CI and the "change only with a stated reason" rule.
  - Never reaches the client: `golden.json` and the generator are test-only and must not be imported by app code. Checked by a grep in review and by the build output.
  - Data: answers are synthetic. A review step confirms the file contains no real person's answers.
- **Risks and rollback:** Risk: the golden file records a bug as correct. Mitigation: it records today's behaviour on purpose, and a real bug found later is fixed in its own pull request that updates the golden file with a reason. Rollback: revert the commit; no production system is touched.
- **ADRs written:** 0001, 0002, 0003 (proposed).

Design approved by the human on: _(pending)_

## 3. Test plan

| # | Criterion or piece | Unit | Integration | End-to-end | Performance | Access |
|---|---|---|---|---|---|---|
| AC1 | Generator covers thresholds, pooling, bands, gates | test that the case list contains each named category | n/a | n/a | n/a | n/a |
| AC2 | Golden records all outputs | schema check of `golden.json` | n/a | n/a | n/a | n/a |
| AC3 | Drift fails with a readable diff | the golden test itself | n/a | existing e2e unchanged | n/a | n/a |
| AC4 | Runs in CI, within 2 s | n/a | CI run on the pull request | n/a | timed in the vitest report | n/a |
| AC5 | Test can detect drift | manual mutation check, result recorded in Evidence | n/a | n/a | n/a | n/a |
| AC6 | Rule is documented | n/a | n/a | n/a | n/a | n/a (reviewed by reading) |
| AC7 | Nothing else changes | the existing 362 tests | n/a | existing Playwright suite green | n/a | n/a |

Performance budget used: golden test within 2 seconds on CI (proposed, human to confirm); baseline figures for the website bundle and a full-intake run are measured in this slice and recorded below as "no worse than today" until the human sets targets.

Refusal tests: not applicable (no roles, no server). The equivalent check is that the golden test fails when a bracket changes (AC5).

## 4. Build log
_(not started)_

## 5. Evidence
_(not started; baseline before the slice: `npm test` 362 tests passed, 10 files, run 25.11.2026)_

## 6. Pipeline
- Checks the pipeline runs for this change: existing CI (install, audit, lint, typecheck, tests, build, e2e). The golden test runs inside `npm test`.
- Steps to add: none expected; confirm the new test file is picked up by `npm test`.

## 7. Release
Not a release: merged to `main` by pull request on the human's yes. Nothing is deployed differently, since the website's output is unchanged.

## 8. After release
Smoke check that the website still builds and its Vercel deployment is unaffected.

## Done
- [ ] Every acceptance criterion has a passing test and was seen working
- [ ] All test layers ran, results above
- [ ] Pipeline runs the same checks and is green
- [ ] Reviewed by a second reader
- [ ] Docs updated (`ARCHITECTURE.md` §5 marks S1 done)
- [ ] Human approved design and merge
- [ ] `/secure` check ran with evidence; no Critical or High open
