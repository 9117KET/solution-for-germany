# ADR 0002: An instrument is JSON data with a hand-written runtime validator

Date: 2026-11-25 · Status: proposed · Decided by: Kinlo (chose this option 25.11.2026)

## Context
Today the care assessment is TypeScript constants (`lib/rules/nba.ts` bracket tables,
`lib/intake/criteria.ts`). The application promises "a data format that describes an instrument:
modules, conversion tables, 'higher of two modules' pooling, caps and grade thresholds", rule sets
with valid-from dates, a check that tables are monotonic, and a script that compares the data with
the official text on gesetze-im-internet.de. An instrument file is also **untrusted input** once
other people write their own.

## Options considered
| Option | For | Against |
| --- | --- | --- |
| JSON data plus a runtime validator | Language-neutral; diffable against the law text; the comparison script and the monotonicity checker read the same file; no dependency if the validator is hand-written | The validator is code we write and test ourselves; no compile-time types for authors unless we derive them |
| Typed TypeScript objects | Type safety while editing; no parsing step | Only usable from TypeScript; harder to compare with the official XML; cannot be loaded as data |
| Both, JSON canonical with generated types | Most flexible | More tooling for a first release |

## Decision
JSON is the format. The engine ships a validator written by hand (no schema-library dependency)
that rejects an instrument with a precise path and message. TypeScript types for the loaded
structure are exported by the package; deriving them from a schema is deferred.

## Consequences
- Easier: other languages and tools can read the same files; the official-text comparison is a plain
  diff of two data sets.
- Harder: the validator must be thorough and is part of the security surface (below).
- Must be true everywhere: no instrument is evaluated before it passes validation; no code path
  uses `eval`, `Function` or dynamic `import` on instrument content; validation bounds sizes and
  depth and rejects keys such as `__proto__`, `constructor` and `prototype` so an instrument cannot
  pollute object prototypes.
- Revisit if authors ask for type checking at edit time (then add generated types from a schema).

## Sources
`lib/rules/nba.ts` and `lib/intake/adaptive.ts` read 25.11.2026;
`docs/dossier/antrag/j03_antrag_live.md` (Q4).
