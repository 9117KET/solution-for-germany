# Anspruch

Work out which German care benefits (*Pflegeleistungen*) a household is entitled to,
and how much of that money is going unclaimed.

You answer questions about everyday life. The app estimates the *Pflegegrad* the
assessment would likely arrive at, compares the resulting entitlement against what
the household already receives, and lists what to do about the difference, in order,
with the statutory basis for each step. At the end it hands you a PDF to take with
you.

Typically that takes **twelve to twenty questions**, against the sixty-four the
official instrument contains, and the answer is the same one the long version would
have produced. How that is possible is the next section.

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

## The intake is short, and not by guessing

Seventy screens is not a form, it is an endurance test, and the people this exists
for do not finish it. An intake nobody finishes estimates nothing. Four things get
it down to roughly fifteen, and none of them is an approximation:

**It stops when the answer can no longer change.** Every unanswered question is a
range rather than a blank, so the arithmetic is run twice: once assuming the best of
everything still unasked, once assuming the worst. That brackets the grade. When the
two bounds agree, the remaining questions provably cannot move it and the intake
ends. This is sound because the assessment is monotonic in every module. A household
already past 70 points does not need to be walked through social contacts to be told
it is Pflegegrad 4. Where the bounds do not agree, the report shows a **range**, and
offers the open questions back. It never picks the midpoint. See `lib/intake/adaptive.ts`.

**Two screening questions close half the instrument.** Modules 2 and 3 are 24 of the
48 criteria and compete for a *single* 15-point slot, so only the higher of the two
ever counts. One question about memory and one about difficult behaviour score them
at zero on a no, which is exactly what answering all 24 at the unimpaired level would
have produced.

**Module 5 is asked at the level it is scored at.** The instrument lists sixteen rows
and asks how often each happens, then pools them into three groups and converts each
group total against four thresholds, discarding everything below. So four questions
ask for the band directly, with the options written as the thresholds themselves. The
score is not an approximation of the long form; `adaptive.test.ts` computes it both
ways and asserts one number.

**Criteria that describe one activity are asked together.** "Washing the upper body",
"grooming the head", "washing the intimate area" and "showering or bathing" become
one question. This is the only reduction that can cost accuracy, so it is the only
one that can be undone: every group opens up and its criteria can be answered one by
one, and collapsing keeps the most dependent answer given.

The report always says how many questions were asked out of sixty-four, and why the
rest were dropped. A tool that quietly skips two thirds of an assessment and presents
a number is, from the outside, indistinguishable from one that is guessing.

Someone who has had enough can stop at any question and see what there is. That is
safe precisely because of the range: a partial intake produces "between Pflegegrad 2
and 4", never a confident 2.

## The PDF

The result downloads as a PDF, built in the browser by `jspdf` and written nowhere
else. No render service, no upload, no network call, and the library is only fetched
if someone actually asks for a file.

It is written in German or English and never in the other four interface languages.
That is a product decision rather than a font problem: the PDF is what gets handed
across a desk at the Pflegekasse, and a Turkish document is of no use there. The
interface stays in the reader's language; the document they take with them is in the
language of the form, and the button says so.

It carries the estimate, the money, the ordered list of what to do with the statute
for each step, and **the answers that were given**. That last part is the reason to
print it: the Begutachtung is an interview asking the same things, and a family that
walks in with its own answers written down does not have to remember, on the spot,
how often the nights are bad.

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
| `lib/intake/adaptive.ts` | Grade bounds, and the rule that ends the intake early |
| `lib/intake/groups.ts` | Which criteria are asked as one question, and how a group opens up |
| `lib/report/pdf.ts` | The downloadable PDF, assembled on the device |
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
- Grouped questions trade a little fidelity for a much shorter intake. Where a
  household differs across the criteria in a group, the group has to be opened up by
  hand; nothing detects that automatically.
- The PDF is German or English only, for the reason given above. Someone reading the
  Arabic interface gets a German document.

## Licence

Not yet chosen.
