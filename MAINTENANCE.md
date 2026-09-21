# Maintaining Anspruch

Written for whoever holds this next, including the version of me who has
forgotten. The code is the easy part. What follows is the part that decides
whether this product is still honest in eighteen months.

## The one failure that matters

A wrong euro amount here does not look wrong. It arrives with a paragraph
reference beside it, which makes it *more* believable, not less. There is no
server to alert and no error to log, so nothing breaks loudly — a family simply
finds out at the counter that what they were told was untrue, and then disbelieves
everything else the tool said, including the parts that were right.

Every rule below exists to stop that happening quietly.

## The January ritual

German care figures change at the turn of the year, and the tests will start
failing before they do. Budget half a day.

1. Open `lib/rules/sources.ts`. It is the only file with amounts in it.
2. For each entry, follow its `url` and confirm the figure still reads the same.
   Read the `note` field first — several record a change that was proposed but
   not enacted, and those are the ones that move.
3. Where a figure changed, update it in `lib/rules/benefits.ts` and set the
   entry's `checkedOn` to today. Where it did not, still set `checkedOn`: the
   date records *that a human looked*, not that something moved.
4. Run `npm test`. `rules.test.ts` pins several amounts deliberately, so a
   changed figure will fail there too. That is the test doing its job — update
   the expectation once you have confirmed the new value against the statute.
5. Re-read `README.md` for anything now out of date.

Cross-check against the BMG's *Zahlen, Daten und Fakten zur Pflegeversicherung*,
which consolidates the amounts in one place and is easier than reading seven
paragraphs of SGB XI. Do not treat it as the source — it is the cross-check.
`gesetze-im-internet.de` is the source.

### Known cliff

`sources.ts` records that Pflegegeld has **no increase scheduled before
1 January 2028** (the 2026 *Nullrunde*). Put that date in a calendar now. The
freshness test will have fired at least twice before then, which is the point.

## The freshness test

`lib/rules/freshness.test.ts` fails the build once the oldest `checkedOn` passes
`FAIL_AFTER_DAYS` (180). Nothing is broken when it fires — the figures are simply
older than this product is willing to state without a human having looked again.

**Clearing it means doing the January ritual.** Raising the threshold is not a
fix: it moves the date at which a family is told a wrong number. If you are
genuinely mid-emergency and need a deploy, ship it, but open an issue in the
same hour.

The report shows the date to the reader from day one, and says so in words past
`WARN_AFTER_DAYS` (120). An adviser can then judge freshness themselves rather
than trusting that somebody kept up.

## What the tests actually cover, and what they do not

Roughly three hundred tests pass. Know what that does and does not buy:

| Suite | What it proves |
| --- | --- |
| `rules.test.ts` | The conversion tables and the gap analysis behave as specified |
| `adaptive.test.ts` | The short intake and the long form produce the same number |
| `monotonicity.test.ts` | The bounds bracket every completion, and the early stop is sound |
| `a11y.test.ts`, `contrast.test.ts` | Every theme pair meets WCAG AAA |
| `fixtures/` | **Nothing yet.** See below |
| `e2e/smoke.mjs` | That the pages render, the voice notice fires, the report is dated |

Everything above the last row checks the model **against itself**. Both scoring
paths read the same `criteria.ts`, so a misreading of the official instrument —
a transposed point value, a criterion under the wrong module — passes every one
of those tests twice and looks like agreement.

`lib/rules/fixtures/` is the only place that can catch that, and it is empty.
`cases.ts` says where real cases come from. **Ten of them would tell you more
about whether this is correct than the next two hundred unit tests.** The
likeliest source is a pilot: when a family's Bescheid arrives, that is a
labelled case. Ask for it, with consent, and keep only the numbers.

## Before any release

```bash
npm test && npm run typecheck && npm run lint && npm run build
npm start &                      # serve the build
npm run test:e2e                 # then drive it in a real browser
```

`test:e2e` uses Playwright. The first run downloads a browser (`npx playwright
install chromium`); in a sandbox that already has one, point `CHROMIUM_PATH` at
it instead. It needs a server on :3000 and says so if there is none.

Then, by hand, because even the browser suite does not cover it:

- Download the PDF and read it. The e2e run reaches the report but does not
  open the file.
- Try it once at the largest text size and once on yellow-on-black.
- If anything about voice, storage or hosting changed, `/datenschutz` is now
  wrong until you fix it. Treat that as part of the change, not as follow-up.

## Things that are true about the deployment

- **Hosting is Vercel.** Server logs (IP, user agent) exist and are disclosed in
  `/datenschutz`. If hosting moves, that page changes.
- **Fonts are self-hosted** by `next/font/google` at build time. No runtime
  request to Google. If that ever changes, `/datenschutz` changes.
- **Speech recognition is not local.** Chrome and Edge upload the audio. This is
  disclosed in `/datenschutz` and, since the voice notice landed, at the point
  where voice is chosen. Do not let a refactor drop either.
- **The four unreviewed languages.** Turkish, Russian, Polish and Arabic
  interface copy has not been checked by a native speaker. Every string added
  since only deepens that debt. Keep a list; get it reviewed before this is
  promoted anywhere those languages are the reason someone came.

## Bus factor

One maintainer, statutory content, users who will not notice when it goes wrong.
The AGPL means somebody *can* fork this; nothing means somebody *will*.

The freshness test is the automated backstop — it converts "I meant to check"
into a red build. It is not a substitute for a second person with deploy access.
A Wohlfahrtsverband partnership is the likeliest place that person comes from,
which is one more reason the outreach and the engineering are the same project.
