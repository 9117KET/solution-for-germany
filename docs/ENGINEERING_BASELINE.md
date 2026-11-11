# Engineering baseline: Anspruch

Date: 2026-11-11 · HEAD: `36e081a` · Previous baseline: none

## Progress since this baseline

The tables below are the audit as it stood at `36e081a`. Gaps closed since:

| Gap | Closed by | Items now met |
|---|---|---|
| 1. CI workflow | PR #11 (`.github/workflows/ci.yml`; actions pinned to commit SHAs) | A1, A2, A3, A4, A5, A8 |
| 2. Protect `main` | GitHub setting, 2026-11-11: pull request required (0 approvals), check "Lint, typecheck, test, build" required from GitHub Actions, applies to admins, no force push, no deletion | A10; D3 partly (merges gated, local actions still by rule) |
| 3. End-to-end tests | `docs/features/2026-11-11-e2e-tests.md`: Playwright, Chromium + Firefox + WebKit at phone size, 11 tests × 3 engines, run in CI | A6, B3, B4 (privacy rule) |
| 5. Automated accessibility | Same change: axe on welcome, a question and the report, de and ar; fixed WCAG 2.5.3 on the text-size buttons | B6 |

Mark each item **met**, **partly** or **not met**, with the file or command output that shows it.
A thing that cannot be found is "not found in the repo", never guessed.

Shape of the app, for reading the items below: Next.js 16.4.2, React 19.2.8, four statically
prerendered routes (`/`, `/datenschutz`, `/impressum`, `/_not-found`), no server code, no
database, no accounts. Answers are stored in the browser only. Deployed on Vercel through the Git
integration (GitHub deployments show Production on 2026-10-22 and 2026-10-23). Analytics
(Plausible) are built in but off by default.

Commands run for this baseline, on Windows, in this session:

| Command | Result | Wall time |
|---|---|---|
| `npm run lint` | clean, no findings | 16.5 s |
| `npm run typecheck` | clean (`next typegen && tsc --noEmit`) | 10.6 s |
| `npm test` | 9 files, 348 tests, all passed (vitest 4.1.12, 1.39 s inside vitest) | 5.5 s |
| `npm run build` | compiled; 4 routes, all static | 12.9 s |

## A. Pipeline
| # | Item | State | Evidence |
|---|---|---|---|
| A1 | A pipeline runs on every pull request and on the default branch | **not met** | No `.github/` folder in the repo. The only automated step on a pull request is the Vercel preview build (the one comment on each of PRs 1–10 is from the `vercel` bot) |
| A2 | It runs lint | **not met** | No pipeline. The Vercel build runs `next build`, which does not run ESLint in Next 16 |
| A3 | It runs typecheck | **partly** | Only as a side effect: `next build` runs TypeScript ("Finished TypeScript in 2.8s") on Vercel. No `next typegen && tsc --noEmit` step |
| A4 | It runs unit and integration tests | **not met** | `vitest run` is never run outside a laptop |
| A5 | It runs the build | **partly** | The Vercel preview deployment builds each pull request; a failed build shows as a failed deployment, not a required check |
| A6 | It runs end-to-end tests | **not met** | No end-to-end tests exist (B3) |
| A7 | It runs a performance check | **not met** | No budget, no Lighthouse or bundle check |
| A8 | No blocking check is `continue-on-error` | **not applicable yet** | No workflow file |
| A9 | The default branch is green now | **met, locally** | The four commands above pass on `36e081a`. Not shown by any CI run |
| A10 | Merging on red is prevented | **not met** | `gh api …/branches/main/protection` returns "Branch not protected" (404). No written rule in the repo |
| A11 | A second reader reviews each pull request | **partly** | `gh pr list`: PRs 1–10 have 0 reviews. A second reader did take part before merge, though: each change came from an `/orchestrate` run with a scout check and a supervisor review (`.orchestration/runs/*/check-*.md`, `review-*.md`). Those files are untracked, and none of it shows on the pull request |

## B. Tests
| # | Item | State | Evidence (counts, duration) |
|---|---|---|---|
| B1 | Unit tests exist and pass locally | **met** | 348 tests in 9 files, 1.39 s: `lib/rules/rules.test.ts`, `lib/intake/{intake,adaptive,session}.test.ts`, `lib/a11y/{a11y,contrast,speech}.test.ts`, `lib/analytics/analytics.test.ts`, `lib/legal/legal.test.ts` |
| B2 | Integration tests cross real boundaries | **partly** | The app has no database or API, so the boundaries are intake → scoring → rules → report and the browser `localStorage` session. `adaptive.test.ts` chains intake, scoring and NBA tables. `session.test.ts` covers the pure session logic, not `session-store.ts` against real storage. Nothing renders a component |
| B3 | End-to-end tests cover the main user paths in a real browser | **not met** | No Playwright or Cypress dependency or config. The main path (welcome → questions → report → PDF), resuming a saved intake, erase, the six languages with Arabic RTL, and voice are covered only by manual live tests (`.orchestration/runs/2026-10-22-live-test-fixes/`) |
| B4 | Access tests cover each role and the signed-out case | **not applicable** | No accounts or roles. The nearest equivalent, "no answer leaves the device", is pinned for analytics by `analytics.test.ts`, but nothing in a real browser checks for no outbound requests (`docs/DEPLOY.md` keeps that as a manual tick box) |
| B5 | Performance budgets are written down and checked | **not met** | Not found in the repo |
| B6 | Accessibility is checked automatically | **partly** | `contrast.test.ts` pins WCAG AAA (7:1) for every text pair in all four themes. No automated check (for example axe) runs on a rendered screen, and no keyboard-path test |
| B7 | Areas with logic and no tests | listed | `lib/report/pdf.ts` (333 lines, the document people take to the Pflegekasse), `lib/intake/summary.ts` (133), `lib/intake/session-store.ts` (72, real `localStorage`), `lib/a11y/store.ts` (58), and every component: `components/report.tsx` (686), `ui.tsx` (410), `welcome.tsx` (312), `settings.tsx` (293), `a11y-bar.tsx` (267), `question.tsx` (262), `voice.tsx` (254), plus the page state in `app/page.tsx` |

## C. Architecture record
| # | Item | State | Evidence |
|---|---|---|---|
| C1 | `docs/ARCHITECTURE.md` (or equal) states the stack and why | **partly** | No `docs/ARCHITECTURE.md`. `README.md` explains the design ("Built around that", the adaptive intake, the PDF, traceable numbers) and has a layout table, but it never names the stack and why Next.js, static output and jsPDF were chosen |
| C2 | It matches the code today | **met, for what README covers** | The layout table matches the tracked files. The README lists `/impressum` and `/datenschutz` |
| C3 | Decisions are recorded | **partly** | No `docs/adr/`. Decisions live in README prose (PDF only in German or English; questions stay German or English; browser translation off) and in untracked `.orchestration/` specs |
| C4 | The project `CLAUDE.md` holds commands, conventions and an "SDLC" section | **not met** | `CLAUDE.md` is `@AGENTS.md`, and `AGENTS.md` holds only the Next.js docs notice. Commands are in `README.md` "Running it" |
| C5 | Design rules exist (tokens, type, spacing, components) | **partly** | Four themes and their contrast are pinned (`lib/a11y/settings.ts`, `contrast.test.ts`), and the shared components are in `components/ui.tsx`. No written design-rules document |
| C6 | Current docs for the main libraries are reachable | **met** | `node_modules/next/dist/docs/` (01-app, 02-pages, 03-architecture, 04-community), pointed to by `AGENTS.md` |

## D. Safety
| # | Item | State | Evidence |
|---|---|---|---|
| D1 | Local or staging environment exists, separate from production | **met** | `npm run dev` for local; Vercel Preview deployments per pull request (GitHub deployments list "Preview"); `docs/DEPLOY.md` scopes analytics variables to Production only |
| D2 | Migrations are versioned and have a way back | **not applicable** | No database. The one stored shape is the browser session in `lib/intake/session.ts`; a change to it is a data-shape change (Feature tier) and needs a version check on read |
| D3 | Production writes and destructive actions need a human yes | **partly** | Stated as a rule in the global `CLAUDE.md` and the `/sdlc` skill. Not enforced: no project `.claude/settings.json`, no global deny rules or hooks, and `main` is unprotected, so any push to `main` deploys to production |
| D4 | Secrets are out of the repo | **met** | `.gitignore` excludes `.env*` except `.env.example`; `.env.example` holds only commented public `NEXT_PUBLIC_*` names. The app has no server secrets |
| D5 | Backups exist and a restore has been tried | **not applicable / met by Git** | No server-side data. The code is on GitHub (public repo `9117KET/solution-for-germany`). Not covered: `.orchestration/`, `docs/outreach/` and `docs/research/` are untracked and exist only on this laptop |
| D6 | A release can be rolled back, and how is written down | **partly** | Vercel keeps earlier production deployments, so instant rollback works. `docs/DEPLOY.md` does not say how |

## E. Production
| # | Item | State | Evidence |
|---|---|---|---|
| E1 | Error monitoring is live on client and server | **not met** | No Sentry or equivalent in `package.json`. Client errors in a family's browser are invisible |
| E2 | Someone or something reads it and failures become tickets or fix pull requests | **not met** | Follows from E1 |
| E3 | A smoke check runs against the live site after release | **not met** | `docs/DEPLOY.md` "After the first deploy" is a manual checklist, unticked, and the production URL is still `[https://…]` |
| E4 | Uptime or scheduled-job health is watched | **not met** | Not found in the repo. There are no scheduled jobs. The statutory figures do have a freshness date (`checkedOn: '2026-10-22'` in `lib/rules/sources.ts`), but nothing flags them when they go stale, and the PNOG reform could change them |

## Gaps, in the order to close them
| # | Gap | Why this order | Size |
|---|---|---|---|
| 1 | Add `.github/workflows/ci.yml`: on pull request and push to `main`, `npm ci`, lint, typecheck, `npm test`, build. No `continue-on-error` | Everything later relies on a pipeline that runs the checks. All four pass today, so the workflow starts green | Patch |
| 2 | Protect `main`: require the CI check and a pull request, and block force pushes | A push to `main` deploys to production with no gate (A10, D3) | Settings change, the human's click |
| 3 | End-to-end tests with Playwright: the full intake to report to PDF in German and Arabic RTL, resume and erase, and no outbound request with analytics off. Add them to CI | The main paths and the privacy promise are checked only by hand (B3, B4) | Feature |
| 4 | Unit tests for `lib/report/pdf.ts` (text content, German and English) and `lib/intake/summary.ts`; an integration test for `session-store.ts` against jsdom storage | This is the document a family hands across a desk, and it has no tests (B7) | Patch × 2 |
| 5 | Automated accessibility: axe on welcome, a question and the report, in the Playwright run | Accessibility is the product's core promise; today only contrast is pinned (B6) | Patch, after 3 |
| 6 | Performance budget: measure today (Lighthouse on `/`, first-load JS), propose "no worse than today", check it in CI | Asks the human for targets; must not be invented (B5, A7) | Patch + a decision |
| 7 | `docs/ARCHITECTURE.md` and the first ADRs (static, client-only, no server; jsPDF on device; German or English for questions and PDF; Plausible behind a flag) | Turns README prose and untracked specs into a record that later changes must follow (C1, C3) | Docs |
| 8 | Write rollback (Vercel Instant Rollback) and the production URL into `docs/DEPLOY.md`; add a smoke script that loads the live `/`, `/impressum` and `/datenschutz` and checks status 200 and the page title | Release and recovery should not depend on memory (D6, E3) | Patch |
| 9 | Error monitoring on the client, chosen to fit the privacy promise (no answers, no identifiers, EU region), with the Datenschutzerklärung updated to match | E1 is the biggest blind spot after launch, but any tool sends data from the browser, so it is a product and legal decision, not a default | Feature, the human decides |
| 10 | A stale-figures check: a test that fails when any `checkedOn` in `lib/rules/sources.ts` is older than a set age, or a scheduled reminder | Wrong euro figures are the worst failure this product can have (README "A number that is too high is worse than no number") | Patch |
| 11 | Commit or back up `.orchestration/`, `docs/outreach/`, `docs/research/` (or decide they stay private and move them out of the repo folder) | Work products exist only on this laptop (D5) | The human decides |

## Proposed "SDLC" section for the project `CLAUDE.md`

```markdown
## SDLC

Commands (run in this order; all must pass before a pull request):
- lint: `npm run lint`
- typecheck: `npm run typecheck`
- unit and integration: `npm test`
- build: `npm run build`
- e2e: not yet (gap 3, Playwright planned)
- performance: not yet (gap 6)
- smoke: not yet (gap 8)

Budgets: none yet. Measure first, then the founder sets them. Until then: no worse than today.

Environments:
- local: `npm run dev`, http://localhost:3000
- preview: Vercel preview deployment per pull request; analytics variables unset
- production: Vercel, deployed from `main` by the Git integration. URL: [to fill]

Deploy path: merge to `main` → Vercel builds and promotes to production automatically. Only the
founder merges.

Rollback: Vercel dashboard → Deployments → previous production deployment → Instant Rollback.
Then revert the merge on `main` so the next deploy does not bring the change back.

Monitoring: none yet (gap 9). Plausible, if switched on, counts usage only; it is not error
monitoring.

Protected (never changed without the founder's yes):
- `lib/intake/criteria.ts`: transcription of the official instrument, verifiable line by line
- `lib/rules/sources.ts` figures and `checkedOn` dates: statutory values
- `lib/legal/`: Impressum and Datenschutzerklärung text (marked for a lawyer)
- Vercel environment variables, especially `NEXT_PUBLIC_ANALYTICS_PROVIDER`
- `main` branch: no direct push, no force push
```
