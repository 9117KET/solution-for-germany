# Security baseline: Anspruch

Date: 2026-11-16 · HEAD: `2f83d8f` (branch `sdlc-followups`, plus the uncommitted CI audit step
and `lib/report/pdf.test.ts`) · Previous baseline: none · Stack: Next.js 16.4.2, React 19.2.8,
four statically prerendered routes, no server code, no database, no accounts, no payments, no
model calls. Hosted on Vercel through the Git integration. Analytics (Plausible) built in, off by
default.

Each item is **met**, **partly**, **not met** or **not run**, with the evidence. The question
behind each id is in `~/.claude/skills/secure/references/checklist.md`. A domain the project does
not have is marked "not applicable" as a whole, with the reason.

What there is to protect, in one paragraph: the answers a family gives (health data, Art. 9 DSGVO)
live only in that browser's `localStorage` and in the PDF built on the device. Nothing is sent to
a server. So the risks are (1) script running in the page that could read those answers, (2) a
change to the code or its dependencies that starts sending them, (3) the path by which code
reaches production, and (4) a wrong figure, which is a product risk, not covered here.

## D. The seven doors
| # | Item | State | Evidence |
|---|---|---|---|
| D1 | What the browser loads holds nothing private | **met** | The build is four static pages (`npm run build`, this session: `/`, `/_not-found`, `/datenschutz`, `/impressum`, all "○ Static"). The name, address and email in `lib/legal/blanks.ts` are public on purpose (§ 5 DDG) |
| D2 | No key in client code, public env vars or git history | **met** | Pattern scan (AWS, Stripe, OpenAI-style, GitHub, Slack, private keys, JWTs, Google keys, `service_role`, generic `key/secret/token = "…"`): 0 hits in tracked files, 0 in `git log --all -p`, 0 in `.next/static`, 0 in the untracked `docs/outreach`, `docs/research`, `.orchestration`. The only env vars are four `NEXT_PUBLIC_*` analytics settings (`lib/analytics/index.ts:140`, `lib/analytics/plausible.ts:28-36`), none secret |
| D3 | Row level security on every exposed table | **not applicable** | No database |
| D4 | Every lookup by id checks ownership on the server | **not applicable** | No server, no records by id |
| D5 | Admin routes need a login and a role | **not applicable** | No admin function, no login. `app/` holds `page.tsx`, `impressum/page.tsx`, `datenschutz/page.tsx` only; no `route.ts`, no server action |
| D6 | Signup and free credits limited for signed-out callers | **not applicable** | No signup, nothing paid is called |
| D7 | Every webhook verifies its signature | **not applicable** | No webhook, no API route |

## AC. Access control and ownership
**Not applicable**, AC1 to AC15, AC17, AC18: there are no roles, no accounts, no server-side
resources and no endpoint. Every visitor is the same anonymous reader of static files, and the
only data is the visitor's own, on their own device.

| # | Item | State | Evidence |
|---|---|---|---|
| AC16 | Access control matrix in the project `CLAUDE.md` | **not met** | `CLAUDE.md` holds only `@AGENTS.md`; no "Security" section. A short one is proposed at the end of this file (finding F4) |

## AU. Authentication and sessions
**Not applicable**, AU1 to AU14: no login, no password, no cookie, no token. The "session" in
`lib/intake/session.ts` is the saved answers in `localStorage`, not an authenticated session.

## SE. Secrets and the client bundle
| # | Item | State | Evidence |
|---|---|---|---|
| SE1 | No secret in client code or public env vars | **met** | See D2 |
| SE2 | History clean (scanner output) | **partly** | Pattern grep over `git log --all -p`: 0 hits. `gitleaks` and `trufflehog` are not installed, so no dedicated scanner ran |
| SE3 | `.env` ignored, example committed | **met** | `.gitignore:34-35` (`.env*`, `!.env.example`); `.env.example` is the only env file ever added (`git log --all --diff-filter=A`), and holds four commented public names |
| SE4 | No production source maps | **met** | `find .next/static -name "*.map"`: 0 files after `npm run build` |
| SE5 | Paid and privileged keys used on the server only | **not applicable** | No such key exists |
| SE6 | Short-lived or scoped credentials | **not applicable** | CI uses no secret; the workflow token is `contents: read` (`ci.yml:13-14`) |
| SE7 | Secrets not logged or returned | **not applicable** | No secret |
| SE8 | Secrets scan pre-commit and in CI | **not met** | No scan step in `.github/workflows/ci.yml`, no pre-commit hook (F3) |
| SE9 | Push protection on | **not run** | A repository setting. The GitHub API read failed in this session; see "Not run" |
| SE10 | Leak order written down | **not met** | Not found in the repo. Little to leak today, but the order should exist before the first secret does (F4) |
| SE11 | No third-party credentials in content or MCP config | **met** | No `.mcp.json` or `.claude/` folder in the repo; scan of the docs folders: 0 hits |

## DB. Database and platform rules
**Not applicable**, DB1 to DB22: no database, no storage bucket, no realtime channel, no server
function. DB22 (backups) for the code is Git on GitHub; the untracked work in `.orchestration/`,
`docs/outreach/` and `docs/research/` exists on one laptop only (engineering baseline, gap 11).

## MO. Money paths
**Not applicable**, MO1 to MO23: no payment, no webhook, no quota, no paid API call.

## SC. Supply chain and CI
| # | Item | State | Evidence |
|---|---|---|---|
| SC1 | Lockfile committed | **met** | `package-lock.json` tracked |
| SC2 | CI uses `npm ci` | **met** | `ci.yml` step "Install" |
| SC3 | `npm audit` in CI at a chosen level | **met on this branch** | Step "Dependency audit": `npm audit --omit=dev --audit-level=high`, added in this change. Local run: "found 0 vulnerabilities". Not yet merged |
| SC4 | `npm audit signatures` | **partly** | Local run: "109 packages have verified attestations". Not in CI |
| SC5 | No unreviewed `audit fix --force` | **met** | Not run; the lockfile changed only through reviewed pull requests |
| SC6 | Dependabot or equal | **partly** | Alerts and security updates were switched on in the repository settings on 2026-11-11 (engineering record). No `.github/dependabot.yml`, so no scheduled version updates. One Dependabot run failed on 2026-11-11 ("npm_and_yarn in /. for minimatch", `gh run list`) and has not been looked at (F5) |
| SC7 | Install scripts controlled | **partly** | Three packages have install scripts: `core-js`, `fsevents`, `unrs-resolver` (from `package-lock.json`). All are development tooling; none ships to the browser. Scripts are not disabled (`ignore-scripts` not set) |
| SC8 | New package names checked | **met** | Done per change (e2e record, SC8). This change adds no package |
| SC9 | Actions pinned to SHA | **met** | `ci.yml`: `checkout@3d3c42e…`, `setup-node@949feb2…`, `upload-artifact@cf430e0…` |
| SC10 | Token read-only by default | **met** | `permissions: contents: read` (`ci.yml:13-14`) |
| SC11 | No unsafe `pull_request_target` | **met** | Triggers are `pull_request` and `push` to `main` only |
| SC12 | Untrusted context through `env:` | **met** | No `${{ }}` inside any `run:` |
| SC13 | No plaintext secrets; OIDC deploys | **met** | The workflow uses no secret. Deploys are Vercel's Git integration, not a token in CI |
| SC14 | Workflows under CODEOWNERS | **not met** | No `CODEOWNERS` file. One maintainer, so of little effect today (Low, F6) |
| SC15 | Unused dependencies removed; OSV scan | **partly** | `npm audit` (all dependencies): 9 advisories, 8 moderate and 1 high, all in development tooling through `eslint-config-next` (F1 of the e2e record: `zod`, not reachable from the site). `npm audit --omit=dev`: 0. `osv-scanner` not installed |
| SC16 | No self-hosted runners on public repos | **met** | `runs-on: ubuntu-latest` |
| SC17 | Run logs reviewed for leaks | **not run** | Nothing secret can be in them (no secret exists); not read line by line |
| SC18 | Code scanning on; deploy secrets behind environments | **not run** | Repository setting; see "Not run" |

## CD. Delivery and deployment
The deploy path today: a merge to `main` on GitHub triggers Vercel's Git integration, which builds
and publishes production. Pull requests get a preview deployment.

| # | Item | State | Evidence |
|---|---|---|---|
| CD1 | Production branch protected: reviews and status checks | **partly** | Set on 2026-11-11: pull request required, check "Lint, typecheck, test, build" required. Required approvals: 0, because there is one maintainer. Not re-read today |
| CD2 | No force push or delete; admins not exempt | **met, as recorded 2026-11-11** | `docs/ENGINEERING_BASELINE.md`, "Progress since this baseline", row 2. Not re-read today |
| CD3 | Auto-merge off or restricted | **not run** | Repository setting |
| CD4 | Production approval; no self-review | **not met** | One person writes, approves and merges. Accepted in practice by the team size; the compensating control is the required CI check and the agentic review on each pull request (Low, F7) |
| CD5 | Production only from the protected branch | **not run** | Vercel project setting (Production Branch). GitHub deployments show Production from `main` |
| CD6 | CI config changes reviewed; fork pipelines limited | **partly** | Changes to `ci.yml` go through a pull request. Fork pull-request approval setting not read |
| CD7–CD14 | Deploy credentials, environments, test mode | **not applicable** | No deploy token in the repo or CI, no database, no keys, no payment provider |
| CD15 | Previews protected and without production data | **partly** | No production data exists. `docs/COMPLIANCE.md` 3.5 notes a deployment-protection cookie on previews, which suggests protection is on; not verified |
| CD16 | Bypass secret handled as a credential | **not run** | Vercel setting |
| CD17 | Environment never chosen by the client | **met** | Analytics are fixed at build time from `NEXT_PUBLIC_*` (`lib/analytics/index.ts:135-140`); nothing in the URL or storage can switch them on |
| CD18–CD19 | Migrations | **not applicable** | No database. The stored browser session is validated field by field on read (`lib/intake/session.ts:181-219`) |
| CD20 | Security settings shipped as code | **not met** | No response headers are set in code: `next.config.ts` holds only the Turbopack root, and there is no `vercel.json` (F2) |
| CD21 | Deployed state matches the repo | **not run** | Needs a comparison of the live build with `main`; a live request, on the founder's yes |
| CD22 | What ships is the reviewed commit, built by the platform | **met** | Vercel builds from the merged commit; nothing is deployed from a laptop |
| CD23 | Build leaves tracked files unchanged | **met** | `git status --short` after `npm run build` shows only this change's own edits |
| CD24 | Provenance where offered | **not applicable** | Nothing is published to a registry |
| CD25 | Live: signed-out request to a protected endpoint refused | **not applicable** | No protected endpoint |
| CD26 | Live: headers and platform scan | **partly** | Run on the founder's yes, 2026-11-16. Present: HSTS. Absent: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (F2 confirmed live). `Access-Control-Allow-Origin: *` is Vercel's default for static files and exposes nothing here, since no response carries personal data. No platform scan run |
| CD27 | Live: errors and logs read after deploys | **not met** | No error monitoring (engineering baseline, gap 9) |
| CD28 | Who deployed what is logged | **met** | GitHub merge history and Vercel's deployment list |
| CD29 | Rollback understood for code and data | **partly** | Vercel Instant Rollback, or revert the merge. `docs/DEPLOY.md` does not say so, and its production URL is still the placeholder `[https://…]` (engineering baseline, gap 8) |

## WB. Browser hardening
| # | Item | State | Evidence |
|---|---|---|---|
| WB1 | HSTS | **met** | Live, 2026-11-16, `curl -I https://solution-for-germany.vercel.app/`: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| WB2 | `nosniff` | **not met in code** | No `headers()` in `next.config.ts` (F2) |
| WB3 | Framing blocked | **not met in code** | Same. The page could be framed by another site (F2) |
| WB4 | Referrer-Policy | **not met in code** | Same (F2) |
| WB5 | CSP | **not met** | None. This is the control that would stop injected script from reading the saved answers or sending them out, and that would make "nothing leaves this device" enforced by the browser rather than promised (F2) |
| WB6 | Permissions-Policy | **not met in code** | Same (F2) |
| WB7 | Version headers removed | **met** | Same request: no `X-Powered-By`; `Server: Vercel` only |
| WB8 | `no-store` on sensitive responses | **not applicable** | No response carries personal data |
| WB9 | CORS | **not applicable** | No API |
| WB10–WB13 | CSRF, origin checks, server actions | **not applicable** | No cookie auth, no state-changing request, no server action |
| WB14 | Cross-origin isolation headers | **not met in code** | Not set; low value for this app |

## IN. Input, output, injection, uploads
| # | Item | State | Evidence |
|---|---|---|---|
| IN1, IN4, IN5, IN7, IN20 | Server-side validation, queries | **not applicable** | No server input, no query |
| IN2, IN3 | Allowlists; syntax and meaning | **met** | The two inputs from outside the app are validated against allowlists: the partner slug `?via=` (`/^[a-z0-9-]{1,40}$/`, `app/layout.tsx:74`, kept in memory only) and the stored session (`lib/intake/session.ts:181-219`: integers in range, known benefit ids, known question ids, unknown fields dropped) |
| IN6 | Safe regexes | **met** | The slug pattern is a bounded character class; no nested quantifier |
| IN8 | No dynamic identifiers or shell from input | **met** | No shell, no dynamic import from input |
| IN9 | Auto-escaping; sanitised raw HTML | **met** | One `dangerouslySetInnerHTML` (`app/layout.tsx:108`), fed by the constant `APPLY_SETTINGS_EARLY`, which contains no interpolated value. Everything else renders through React |
| IN10 | `http` and `https` links only | **met** | Links in the legal texts are bare `https://` literals in source (`lib/legal/blanks.ts:19-21`); no link is built from input |
| IN11 | No string eval | **met** | `grep` for `eval(`, `new Function`, `document.write`, `innerHTML`: only the line above |
| IN12 | Maintained sanitiser | **not applicable** | No user HTML |
| IN13, IN14, IN19 | URL fetch, redirects | **not applicable** | The app fetches nothing and redirects nowhere; `history.replaceState` uses the page's own path (`app/layout.tsx:76`) |
| IN15–IN18 | Uploads | **not applicable** | No upload. The PDF is generated on the device (`lib/report/pdf.ts`) |

## LL. Models and agents
**Not applicable**, LL1 to LL15: the product makes no model call and has no agent or tool.

## LG. Logging, errors, monitoring, recovery
| # | Item | State | Evidence |
|---|---|---|---|
| LG1 | Global exception handler | **partly** | Storage and PDF failures are caught where they occur (`session.ts:214`, `components/report.tsx` PDF handler). No `error.tsx` boundary found under `app/` |
| LG2 | Generic client errors | **met** | No stack or internal detail is shown to the person |
| LG3 | Rollback on failure | **not applicable** | No transaction |
| LG4, LG6, LG7 | Security events, structured logs | **not applicable** | No server, nothing to log |
| LG5 | No secrets or tokens in logs | **met** | No secret; the analytics events carry bands and settings, never answers (`lib/analytics/index.ts`, tested in `analytics.test.ts`) |
| LG8 | Alerts on spend, auth and money-path errors | **not applicable** | None of these exist |
| LG9 | Leak contact written down | **not met** | Not found in the repo (F4) |

## PR. Privacy and personal data
| # | Item | State | Evidence |
|---|---|---|---|
| PR1 | Data classes written down | **partly** | Described in prose in `lib/legal/datenschutz.ts` and `docs/COMPLIANCE.md`; not as a table in `CLAUDE.md` (F4) |
| PR2 | Personal data pseudonymised in logs and analytics | **met** | With analytics off, a full run to the PDF makes no request to another origin (`e2e/privacy.e2e.ts`, in CI in three engines). With analytics on, events carry no answers and the `?via=` slug is removed from the URL before the script loads (`app/layout.tsx:70-76`) |
| PR3 | Consent before personal analytics | **partly** | Analytics are off. Whether the planned configuration needs consent is an open legal read (`docs/COMPLIANCE.md` 2.6); it must be settled before the provider variable is set |
| PR4 | Sensitive documents not kept longer than needed | **partly** | Answers stay in `localStorage` until the person erases them ("Jetzt löschen", tested in `e2e/session.e2e.ts`). There is no expiry; `docs/COMPLIANCE.md` 2.7 names this as the soft spot (F8) |
| PR5 | Bulk exports restricted and logged | **not applicable** | The only export is the person's own PDF, made on their device |
| PR6 | Deletion on request | **met** | One tap erases the stored answers; nothing is held elsewhere |

## Findings

No Critical and no High finding. `check` is the checklist id.

| id | severity | check | where (file:line) | what an attacker can do | fix | state |
|---|---|---|---|---|---|---|
| F1 | Medium | PR1, live state | Live `/impressum` (checked 2026-11-16); `lib/legal/blanks.ts:32` | Nothing technical. The live Impressum shows `[Vor- und Nachname]` instead of the operator's name, which § 5 DDG requires; this is a legal exposure (a warning letter), and partners will look at this page | Fill `NAME` with the founder's legal name; the founder supplies it | fixed on this branch 2026-11-16 (`NAME = 'Kinlo Ephriam Tangiri'`, `legal.test.ts` green); live after merge |
| F2 | Medium | WB2–WB6, CD20 | `next.config.ts:3-9` | If script ever runs in the page (a compromised dependency, a future injection bug), nothing in the browser stops it reading the saved health answers from `localStorage` and sending them out. Another site can also frame the page | Add `headers()` in `next.config.ts`: a Content-Security-Policy (`default-src 'self'`, `connect-src 'self'` plus the Plausible host only when enabled, `frame-ancestors 'none'`, a hash or nonce for the one inline script), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a minimal `Permissions-Policy`, and `poweredByHeader: false`. A Feature: the CSP must be tested against the inline script, Next's own scripts and jsPDF in three browsers | open |
| F3 | Low | SE8 | `.github/workflows/ci.yml` | A secret committed by mistake in future would reach a public repository unnoticed | Add a secret scan step (gitleaks action pinned to a SHA) and confirm push protection is on | open |
| F4 | Low | AC16, SE10, LG9, PR1 | `CLAUDE.md` | Nothing directly. Without the written rules, a later change (an API route, an error monitor, a form) has no stated promise to be checked against | Add the "Security" section proposed below | open, the founder approves the text |
| F5 | Low | SC6 | Dependabot run 43021811482, 2026-11-11 | A security update for `minimatch` may not have been opened | Read the failed run; add `.github/dependabot.yml` for npm and github-actions, weekly | open |
| F6 | Low | SC14 | repository root | With a second contributor, workflow changes would need no owner's review | Add `CODEOWNERS` when a second person joins | open |
| F7 | Low | CD4 | repository settings | One account can merge its own change to production | Keep the required check and the review on each pull request; add a required approval when a second person joins | open |
| F8 | Low | PR4 | `lib/intake/session.ts:221-230` | Someone else using the same browser later can open the resume offer and see the earlier answers | Decide with the legal read: session-only by default with an opt-in to keep, or an expiry after a set number of days. A product decision | open, the founder decides |

Carried from the e2e record, unchanged: `zod` advisory in lint tooling only (Low, not reachable
from the site).

Not a security finding, but found on the way: `docs/outreach/` holds names and work contacts of
people at 33 organisations. The repository is public. Committing that folder as it is would
publish a contact list; decide where it lives before closing engineering gap 11.

## Gaps in the order to close them

| # | Gap | Finding ids | Why this order | Size |
|---|---|---|---|---|
| 1 | Fill the operator's name on the Impressum | F1 | Live today, and partners and the Prototype Fund will open the page | Patch, needs the founder's name |
| 2 | Secret scan in CI; confirm push protection | F3 | Cheap, and the repository is public | Patch plus one setting |
| 3 | "Security" section in `CLAUDE.md` | F4 | Later changes are checked against it | Docs, the founder approves |
| 4 | `dependabot.yml`; read the failed run | F5 | Keeps the supply chain current without attention | Patch |
| 5 | Response headers and a Content-Security-Policy | F2 | The one control that turns the privacy promise into something the browser enforces | Feature |
| 6 | Decide how long answers stay on the device | F8 | Tied to the open legal read | Decision, then Patch or Feature |
| 7 | Rollback and production URL in `docs/DEPLOY.md`; error monitoring decision | (engineering gaps 8, 9) | Recovery and sight after release | Patch; decision |

## Not run, and why

| Item | Reason | What would let it run |
|---|---|---|
| SE9, SC18, CD1–CD3 re-read, CD6 fork setting | The GitHub API calls did not go through in this session (the permission check on the command failed three times, not GitHub) | Re-run `gh api repos/9117KET/solution-for-germany` and `/branches/main/protection`, or read the settings in the browser |
| CD5, CD15, CD16 | Vercel project settings; the Vercel CLI is not installed and the dashboard was not opened | The founder opens Project Settings, or installs the CLI |
| CD21 | Comparing the live build with `main` | Not done; the header request showed a prerendered page aged about 4.8 days, which fits the 11 Nov merge |
| SE2 with a dedicated scanner, SC15 OSV | `gitleaks`, `trufflehog` and `osv-scanner` are not installed | Install one, or run it in CI (gap 2) |
| `/security-review` on this branch | The diff is one CI step and one test file; the pattern scan and the checks above cover it | Run before merge if wanted |

## Proposed "Security" section for the project `CLAUDE.md`

```markdown
## Security

Data classes
- Public: the app's code and texts; the operator's name, address and email on /impressum.
- Sensitive (health data, Art. 9 DSGVO): a person's answers and their PDF. They exist only in
  that browser's localStorage (`anspruch.session.v1`) and in the file the person downloads.
- Settings: text size, theme, language (`anspruch.settings.v1`), in localStorage.
- Partner slug (`?via=`): in memory for one page visit, never stored, never inside a URL sent out.

Rules (each is a promise made on /datenschutz; a change that breaks one is a Feature and needs
the founder's yes and a change to that page)
1. No answer leaves the device. No API route, server action, form post or third-party script
   may receive answers. `e2e/privacy.e2e.ts` must stay green.
2. Analytics are off unless the production build sets `NEXT_PUBLIC_ANALYTICS_PROVIDER`. Events
   carry bands and settings, never answers.
3. No cookies. No storage beyond the two keys above.
4. No secret exists. The first one (an error monitor, an API key) needs a "Secrets" line here,
   a server-only home, and the leak order below before it is added.
5. Input from outside (the `?via=` slug, stored JSON) is validated against an allowlist.

Access control matrix
| Resource.action | Visitor | Anyone else |
|---|---|---|
| Static pages.read | allow | allow |
| Own answers.read, change, erase, export as PDF | allow, on their own device | deny: never sent anywhere |
| Analytics events.send | only if the build enables it; no answers | n/a |

Deploy path
- Code reaches production only by a pull request merged to `main`; Vercel builds that commit.
- `main` is protected: pull request and the check "Lint, typecheck, test, build" required, no
  force push, admins included. Do not rename that CI job.
- Environment variables are set in Vercel for Production only. No deploy from a laptop.
- Rollback: Vercel Instant Rollback, or revert the merge.

Scanner commands
- Dependencies: `npm audit --omit=dev --audit-level=high` (in CI); `npm audit signatures`.
- Secrets: pattern grep on the diff until a scanner runs in CI.
- Privacy: `npm run test:e2e` (the no-outbound-request test).

If something leaks: tell [founder contact] first. Rotate before purging history; both need the
founder's yes.
```
