# ADR 0001: The engine lives in this repository as an npm workspace

Date: 2026-11-25 · Status: proposed · Decided by: Kinlo (chose this option 25.11.2026)

## Context
The scoring and stop rule are locked inside the Anspruch website (`lib/intake`, `lib/rules`). The
plan is to extract them into a reusable library. The website must keep working and must be the
library's first real user. The repo has one CI pipeline, 362 unit tests and an end-to-end suite
that already protect the website's behaviour.

## Options considered
| Option | For | Against |
| --- | --- | --- |
| Same repo, npm workspaces (`packages/engine`) | One CI and one set of tests; the website proves the package works from day one; refactors touch both in one pull request | The repo root and the package share one `package.json` tooling story; the npm release needs its own build and publish step |
| Separate repository | Clean for outside contributors; release pipeline is simple | Two repos and two pipelines; the website must install the published package to prove it works; every change needs two pull requests |
| Stay inside the website folders | Cheapest now | The code stays "locked inside the website", which the application says is the problem |

## Decision
`packages/engine` in this repository, wired with npm workspaces. The website consumes it from the
workspace through its public exports. A separate repository can be cut later (the package has no
imports from the website, so the split is mechanical).

## Consequences
- Easier: one pipeline; golden results can be checked from both sides; the website is the first user.
- Harder: the engine needs its own `package.json`, build and `exports` map; the repo's lint and
  typecheck configs must cover a second project; `next.config.ts` may need `transpilePackages`
  (to be checked in the current Next docs in S2, not assumed).
- Must be true everywhere: nothing under `packages/engine` imports from the website; checked by a
  lint rule or a test (to be written in S2).
- Revisit if an outside contributor or company needs to work on the engine without the website.

## Sources
`docs/ARCHITECTURE.md` §3; Next 16.4.2 docs on `transpilePackages` and package bundling (path in
ARCHITECTURE §9), to be re-read in S2.
