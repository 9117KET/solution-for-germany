# Documents

Everything in this folder is a draft dated 22 or 23 October 2026. Yellow `[…]` blanks in the
PDFs, and `[…]` in the Markdown, are values the founder fills in before sending. Nothing here
is legal advice; the agreement, the letter of intent and the two legal pages are marked for a
lawyer's review.

## Status at a glance

| Document | Where | Use | Status |
| --- | --- | --- | --- |
| Dossier: state, compliance, programmes, partners, documents, 90-day plan | `dossier/anspruch-dossier.tex` | internal, and for a funder or partner who asks "where does this stand" | draft, blanks |
| Compliance checklist | `COMPLIANCE.md` | before analytics go live | current |
| Deploy guide (Vercel) | `DEPLOY.md` | operating the site | current |
| Partner links and dashboard | `PARTNERS.md` | setting up a partner | current |
| Funding outline | `funding-outline.md` | which programmes, what to confirm | current, 16 questions open |
| Pilot proposal (de, en) | `proposal-organisations.md` | first contact with an organisation | draft, blanks |
| Project description | `dossier/antrag/projektbeschreibung.tex` | funding applications (Prototype Fund fields marked) | draft, blanks |
| Cost and financing plan | `dossier/antrag/finanzplan.tex` | funding applications | draft, amounts blank |
| Time and milestone plan | `dossier/antrag/zeitplan.tex` | funding applications | draft |
| Cover letter | `dossier/partner/anschreiben.tex` | sending the proposal | draft, blanks |
| Letter of intent (de, en) | `dossier/partner/letter-of-intent.tex` | a partner signs it for an application | draft, non-binding |
| Pilot cooperation agreement | `dossier/partner/kooperationsvereinbarung-pilot.tex` | signing a pilot | draft for a lawyer |
| Factsheet (de, en) | `dossier/partner/factsheet.tex` | attach to any first contact | draft, blanks |
| Impressum, Datenschutzerklärung | `/impressum`, `/datenschutz` in the app; text in `lib/legal/` | the live site | draft, blanks, lawyer |

Missing, as the dossier's section 7 says: a licence file (recommendation EUPL-1.2), a record of
processing activities, a data protection concept, an accessibility statement, the founder's CV,
and the two data-processing agreements with Vercel and Plausible.

## Building the PDFs

```
cd docs/dossier
./build.ps1        # Windows PowerShell; or: make
```

PDFs land in `docs/dossier/build/`, which is not committed. See `dossier/README.md`.

## Where the facts come from

Every programme, organisation, amount and deadline in these documents traces to a research
brief in `.orchestration/runs/2026-10-23-dossier/` (`scout-applications.md`,
`scout-organisations.md`) or to the earlier runs of 22 October 2026. Anything a brief could
not verify at its source is marked "zu bestätigen" rather than stated.
