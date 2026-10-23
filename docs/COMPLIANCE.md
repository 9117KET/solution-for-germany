# Compliance: what to do and decide before analytics go live

Draft for legal review. Not legal advice. The texts are `lib/legal/impressum.ts` and
`lib/legal/datenschutz.ts`, rendered at `/impressum` and `/datenschutz`.

Sources, cited by line: **SC** = `.orchestration/runs/2026-10-22-usage-and-partners/scout-compliance.md`,
**SA** = `scout-analytics.md` in the same folder. Items marked *to verify* there are to-dos
here and are not asserted on the pages.

## 1. Fill in the blanks

All blanks are in `lib/legal/blanks.ts` (`BLANKS`); fill them there once and both pages
follow. Still open: the name, then the optional items. `lib/legal/legal.test.ts` fails if a blank is added or dropped without updating
the list.

| Blank | Needed for | Source | State |
| --- | --- | --- | --- |
| Vor- und Nachname | Impressum, controller | § 5 Abs. 1 Nr. 1 DDG, SC:11; Art. 13(1)(a), SC:67 | **Open** |
| Straße und Hausnummer, Postleitzahl und Ort | Ladungsfähige Anschrift; a P.O. box is not enough | SC:11-12 | Filled 23 Oct 2026: Alhardstraße 21, 28757 Bremen |
| E-Mail-Adresse | Fast electronic contact; also where objections go | SC:11 | Filled 23 Oct 2026: kinlotangiri911@gmail.com |
| USt-IdNr. or Wirtschafts-ID, Register, licensing authority, profession | Only if they apply; otherwise delete the lines | SC:11 | Open, "falls zutreffend" |
| Datenschutz-Aufsichtsbehörde of the Land | Right to complain, Art. 13(2)(d) | SC:52, SC:74 | Filled 23 Oct 2026: LfDI Bremen (decision 2.1) |

Filled values carry no brackets; `BLANKS` lists only the open ones.

## 2. Decisions to take

1. **Land of residence and the authority.** Decided 23 Oct 2026: the founder lives in Bremen.
   The authority is "Der Landesbeauftragte für Datenschutz und Informationsfreiheit der Freien
   Hansestadt Bremen", Georgstraße 122-124, 27570 Bremerhaven, office@datenschutz.bremen.de,
   https://www.datenschutz.bremen.de/ (V: the BfDI entry
   https://www.bfdi.bund.de/SharedDocs/Adressen/DE/LfD/Bremen.html and the LfDI Impressum
   https://www.datenschutz.bremen.de/impressum-1478 agree). The BfDI states that the Länder
   authorities supervise the non-public sector, with no exception for Bremen (V); Bremen's own
   pages do not state it (*to verify*). Now in `DPA_AUTHORITY`. SC:52;
   `.orchestration/runs/2026-10-23-bremen-blanks/scout-bremen.md`, section 1
2. **Vercel Hobby or Pro.** Hobby is for non-commercial personal use only; partner links
   and analytics for organisations may count as commercial (*to verify* the fair-use text).
   The plan also sets runtime-log retention (Hobby 1 h, Pro 1 day), which the page does not
   state yet. SC:18, SC:48
3. **Plausible plan.** Custom properties (the `partner` slug and the bands) need the
   Business plan; prices and caps *to verify* at signup. SA:6-7, SA:43, SA:51
4. **DPA with Vercel.** The DPA "forms part of the Enterprise Agreement", while ToS §11.1
   reportedly incorporates it for all; confirm it covers this plan. Sub-processor list *to
   verify*. SC:20, SC:49, SC:59
5. **DPA with Plausible.** Accepted by use, no signature; EU only, no SCCs. Sub-processors
   beyond Hetzner and Bunny *to verify*. SC:31
6. **Legal read on DSK OH Digitale Dienste Rn. 87-90.** No blanket consent-free status for
   reach measurement; custom events with props go beyond a plain count. The page relies on
   Art. 6(1)(f) and does not say consent is not required. Also check Rn. 68/69 (*to verify*): an Art. 6(1)(f) balancing alone may not satisfy § 25(2) Nr. 2. SC:26, SC:60, SA:32-36, SA:40
7. **Legal read on the localStorage persistence (Rn. 80).** Keeping answers across visits is
   the soft spot; session-only is the default outside login services. Mitigations in place:
   nothing written until answered, one-tap erase. SC:24-25
8. **Art. 30 register.** Keep a one-page VVT with three entries: Vercel hosting logs,
   Plausible statistics, Impressum contact email. The Art. 30(5) exemption is likely empty
   (*to verify*). SC:43
9. **BFSG and BITV position.** A free estimator with no contract is probably outside BFSG
   (*to verify* § 2 Nr. 26). Public bodies embedding it fall under BITV 2.0; offer a
   Barrierefreiheitserklärung on request. SC:55-56

## 3. Before analytics go live (in order)

1. Fill every blank in section 1; `npm test` still passes.
2. Decide the Land and authority (2.1) and put it in `DPA_AUTHORITY`. Done 23 Oct 2026 (Bremen).
3. Choose the Vercel plan (2.2); if the plan's log retention should appear on the page, add
   it to section 5 of `lib/legal/datenschutz.ts`.
4. Confirm both DPAs apply (2.4, 2.5) and file them.
5. Check for cookies on the production URL with `curl -I` (*to verify*: only a
   deployment-protection cookie was found). The page says the app sets none. SC:47
6. Confirm Plausible's event retention and put it in section 6 in place of "nicht
   angegeben" (gap). SC:31, SC:64
7. Decide how an Art. 21 objection is honoured. Plausible has no built-in opt-out, and a
   Do-Not-Track or `plausible_ignore` switch would itself be storage (*to verify*). The page
   currently names the email address only. SC:33
8. Confirm `?via=` does not reach Plausible inside a URL (the code strips it, SC:30 *verify*
   against the supported-parameter list).
9. Confirm in the Plausible dashboard that the site's data region is the EU (Plausible
   states EU processing and storage; vendor claim). SA:9, SC:29
10. Get the short legal read (2.6, 2.7) and write the VVT (2.8).
11. Make sure `/impressum` and `/datenschutz` are live, with every blank filled, before
    `NEXT_PUBLIC_ANALYTICS_PROVIDER` is set.
12. Only then set `NEXT_PUBLIC_ANALYTICS_PROVIDER` (see `docs/DEPLOY.md`).

## 4. Open points found in the code (no scout source)

- **Voice input.** Answering by voice uses the browser's speech recognition
  (`lib/a11y/speech.ts`). Neither scout covers this. Section 3 of `/datenschutz` says it
  is optional, done by the browser, possibly on the browser maker's servers, and that the
  operator receives no audio or text; it names no vendor. To do: verify how Chrome and
  Edge process speech recognition and whether to name them.
- **The `gap` band.** `result_shown` sends the monthly unclaimed amount in five bands. It
  is derived from the result, not an answer or the grade; confirm in the legal read (2.6)
  that this is acceptable without consent. SC:40

## 5. What we deliberately do not do

- No cookies set by the app; nothing stored for analytics on the device. SC:30, SC:47
- No accounts. The app sends no answer anywhere (but see voice input in section 4); the operator cannot see answers. SC:39, SC:76
- No grade, points or answer in analytics; a test blocks it. SC:40
- No partner slug in storage: kept in memory for the visit only. SC:25
- No external fonts: Geist is self-hosted by `next/font`. SC:6, SC:35
- No advertising and no third-party trackers besides Plausible when switched on. SC:73
- No cookie banner: nothing as built needs one, subject to the legal read in 2.6. SC:60
