# ADR 0003: Pin today's behaviour first, then extract without changing any result

Date: 2026-11-25 · Status: proposed · Decided by: Kinlo (chose this option 25.11.2026)

## Context
The engine already works and is trusted by the website. The application promises "results identical
to today's website on all test cases". A wrong Pflegegrad estimate costs families money, and the
stop rule is only sound while the tables stay monotonic. Refactoring 4,300 lines of intake and rules
code into a package risks changing a result without anyone noticing.

## Options considered
| Option | For | Against |
| --- | --- | --- |
| Characterization tests, then extract | Proves "identical results" before and after; any drift fails CI | Slower start; the golden file must be generated carefully |
| New generic engine from scratch, port later | Cleaner design | High risk of silent change in results; nothing proves equivalence |
| Data format and validator only | Smallest first release | Postpones the hard part; the stop rule stays locked in the website |

## Decision
Slice S1 pins today's behaviour (a golden file of synthetic answer sets and the engine's outputs,
committed and checked in CI). Slice S2 moves the engine under that net without changing the golden
file. The golden file may change only in a pull request that says why and is approved by the human.

## Consequences
- Easier: every later slice can refactor with a safety net; "identical results" becomes a CI fact.
- Harder: the golden file adds maintenance when the law changes (an intended change updates it
  deliberately, with a source).
- Must be true everywhere: no golden-file change inside a refactor commit.
- Revisit if the golden file becomes too large or slow to run in CI.

## Sources
`docs/ARCHITECTURE.md` §5; `lib/intake/adaptive.test.ts` (existing tests, 649 lines) read 25.11.2026.
