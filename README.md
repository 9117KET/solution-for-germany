# Anspruch

Work out which German care benefits (*Pflegeleistungen*) a household is entitled to,
and how much of that money is going unclaimed.

You answer questions about everyday life. The app estimates the *Pflegegrad* the
assessment would likely arrive at, compares the resulting entitlement against what
the household already receives, and lists what to do about the difference, in order,
with the statutory basis for each step.

Everything runs in the browser. There is no account, no server, and no analytics;
answers never leave the device. They are kept *on* the device, in this browser, so a
half-finished intake survives a closed tab: the next visit offers to carry on or to
delete the lot. Nothing is written until something has actually been answered.

> **This is an estimate, not an assessment.** It reproduces the arithmetic of the
> *Neues Begutachtungsassessment* exactly, but from answers typed by a family rather
> than from an examination by the Medizinischer Dienst. It is not legal advice.
> Statutory care advice under § 7a SGB XI is free and is a legal entitlement.

## Why it exists

Care benefits in Germany are not paid automatically. They have to be applied for,
separately, in language most families do not speak. Money that has already been
awarded routinely goes uncollected (the *Entlastungsbetrag* alone is famously
under-claimed) and the assessment itself is frequently wrong: of the reports that
get checked again, roughly 29 in 100 are corrected.

The people who lose most from this are the ones least equipped to fight it: the very
old, the very tired, and families doing the paperwork in a second language.

## Built around that

**Six interface languages.** German, English, Turkish, Russian, Polish, Arabic,
the largest first languages among family carers in Germany. Arabic renders
right-to-left throughout.

**The questions themselves stay in German or English.** They are transcriptions of a
legal instrument and statements about money someone is entitled to. An unreviewed
translation of that would be worse than none, because it would be believed. The
interface says so plainly, in the reader's own language, and lets them choose which
of the two the questions appear in.

**Plain wording, with the official wording kept.** The instrument says
*"Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken"*. The app leads
with *"Essen klein schneiden und Getränke eingießen"* and keeps the official phrasing
underneath in small type, because that is the wording the assessor will use.

**Set up before the questions, not hidden in a menu.** Text size, colour scheme,
language and pace are on the first screen, applied live. The people who most need
larger text are the least likely to go hunting for a settings panel.

**Four colour schemes**, including black-on-white and yellow-on-black with thickened
borders. Every text pair in every theme meets WCAG **AAA** (7:1), pinned by tests.

**Read aloud, and answer by speaking.** Each question can be read out and answered by
saying the number. Voice is always an addition to tapping, never a replacement: every
question stays fully answerable by tap, and every failure degrades to that.

**One question at a time** by default, with 44px-minimum targets that grow with the
text scale.

## The numbers are traceable

Every euro figure and every threshold carries a `SourceId` pointing at the statute it
comes from, with the date a human last checked it (`lib/rules/sources.ts`). A figure
that cannot be traced does not get shown.

The headline is deliberately conservative. One-off grants never enter the monthly
total. Conditional benefits are reported as "check whether this applies", never as
certain money. *Pflegegeld* and *Pflegesachleistung* are counted **once**, not summed:
they are alternatives under § 38 SGB XI, and adding them would roughly double every
headline and be straightforwardly false.

A number that is too high is worse than no number: the family finds out at the
Pflegekasse, and never trusts anything the tool said again.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm test             # unit tests
npm run typecheck
npm run lint
npm run build
```

## Layout

| Path | What lives there |
| --- | --- |
| `lib/rules/` | The entitlement engine: statute figures, the NBA conversion tables, gap analysis |
| `lib/intake/` | Assessment criteria, scoring, the plain-language overlay, and the saved session |
| `lib/i18n/` | The six interface languages, and the chrome/content boundary |
| `lib/a11y/` | Display settings, speech synthesis and recognition |
| `components/` | Interface |

`lib/intake/criteria.ts` is a transcription of the official instrument and is meant to
stay verifiable line by line against it. Rewording lives in `lib/intake/plain.ts` so
the transcription is never edited for readability.

## Known limits

- The Turkish, Russian, Polish and Arabic interface copy has **not been reviewed by a
  native speaker**. A few strings carry statutory substance and should be checked
  before this is put in front of real families.
- Speech recognition needs a browser that supports it (Chrome and Edge do) and a
  microphone the person grants. Where it is missing, voice mode is not offered.
- Reading a full question aloud takes around 20 seconds, so a complete run in voice
  mode is long.
- Browser machine translation is disabled, because it silently overrode the language
  picker and machine-translated statutory text. That costs speakers of unsupported
  languages a fallback; it is one line in `app/layout.tsx` to reverse.

## Licence

Not yet chosen.
