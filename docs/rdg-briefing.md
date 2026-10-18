# Is Anspruch a Rechtsdienstleistung? A briefing, not an opinion

**This is not legal advice and was not written by a lawyer.** It is the
groundwork for an hour with one: the facts about what this software does, the
two lines of case law that point in opposite directions, and the questions worth
asking. Hand it over; do not rely on it.

Last researched: September 2026.

## Why it is worth an hour

§ 2 Abs. 1 RDG defines a Rechtsdienstleistung as *"jede Tätigkeit in konkreten
fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls
erfordert."* Providing one without authorisation is unlawful, and the realistic
downside is an Abmahnung — plausibly from one of the commercial *Pflegegrad*
services that has an interest in a free competitor going away.

The cost of asking is one consultation. Starthaus Bremen's initial advice is
free and can point you at someone. Do this before the outreach reaches anyone
with a legal department.

## The two decisions that matter, and they disagree

### Smartlaw — this is *not* a Rechtsdienstleistung

**BGH, 9 September 2021, I ZR 113/20.** The Hanseatische Rechtsanwaltskammer
Hamburg challenged Wolters Kluwer's contract generator. The BGH held it did not
violate § 2 RDG: the generator works from a multiple-choice question-and-answer
catalogue, and the algorithm guiding the user is **not a Tätigkeit in konkreten
fremden Angelegenheiten**. The Court compared it to a *Formularhandbuch* — a
form book, which nobody suggests is legal practice.

### Wenigermiete — this *is* a Rechtsdienstleistung, permitted only by licence

**BGH, 27 November 2019, VIII ZR 285/18.** LexFox ran a free *Mietpreisrechner*
at wenigermiete.de which worked out, from a tenant's own data, what they were
owed under the Mietpreisbremse. The BGH did **not** hold this was outside the
RDG. It held that LexFox's activity was covered by its registration as an
*Inkassodienstleister*, on a wide reading of § 10 Abs. 1 Nr. 1 RDG. Remove the
registration and the analysis does not obviously survive.

That the calculator was free did not take it outside the RDG.

## Where Anspruch sits, honestly

**Arguments it is a form book (Smartlaw side)**

- It applies a fixed, published instrument — the NBA — schematically. No
  judgement is exercised on the individual case; the same answers always produce
  the same number.
- It outputs an *estimate*, says so repeatedly, and reports a **range** wherever
  the answers do not settle the grade. It does not assert that rights exist.
- It pursues nothing. No claim is assigned, no representation is offered, no fee
  is charged, no outcome is promised.
- It points the reader at free statutory advice under § 7a SGB XI.

**Arguments it is a calculator (Wenigermiete side)**

- It applies statute to **one household's own data** and states a conclusion
  about **that household's** entitlement — which is what the Mietpreisrechner
  did.
- It names a concrete legal step: lodge a *Widerspruch* under § 84 SGG — and it
  **computes the deadline from that household's Bescheid date**. Working out a
  specific person's limitation period is the part that looks least like a form
  book and most like an Einzelfallprüfung.
- The gap analysis tells a named household which benefits it is not receiving
  but is entitled to. That is closer to "here is what you are owed" than to
  "here is how the system works".

My non-lawyer reading: the deadline calculation and the individualised gap
analysis are the exposure. The estimate itself is the safest part.

## The escape hatch, and its condition

§ 6 Abs. 1 RDG permits **unentgeltliche Rechtsdienstleistungen**. Anspruch is
free and non-commercial, so this is the obvious route.

But § 6 Abs. 2 attaches a condition that is easy to miss: outside family,
neighbourly or similarly close personal relationships, the service must be
provided by — or **under the guidance (Anleitung) of** — a person permitted to
provide it commercially, or someone with *Befähigung zum Richteramt*. Guidance
means real instruction and involvement where the individual case needs it, not a
name on a page.

**This is where the outreach and the legal question turn out to be the same
move.** VdK, SoVD and the Wohlfahrtsverbände run *Sozialrechtsberatung* staffed
by exactly such people. A partnership that puts a qualified adviser in a
guidance role would answer the § 6 Abs. 2 condition and strengthen the product
at the same time. Worth raising explicitly in those conversations rather than
treating it as a separate errand.

## Questions to put to a lawyer

1. On the Smartlaw/Wenigermiete spectrum, where does an estimate plus an
   individualised gap analysis plus a computed objection deadline fall?
2. Does **removing the deadline calculation** — saying "one month from the
   Bescheid, check the date on your letter" instead of printing a date — move it
   materially toward the form-book side? This is a cheap change if it helps.
3. If it is a Rechtsdienstleistung, does § 6 Abs. 1 cover it given that it is
   free and non-commercial, and what would satisfy § 6 Abs. 2 Anleitung in
   practice for software rather than a person?
4. Do the existing disclaimers do any work, or are they decorative? Should they
   be worded differently?
5. Is there anything in publishing it under an open licence — where someone else
   may run a modified copy — that changes the answer for the original author?

## What not to do

Do not attempt to solve this by adding a stronger disclaimer. The BGH did not
decide Wenigermiete on the basis of what the page said about itself.

## Sources

- BGH, 9.9.2021 – I ZR 113/20 (Smartlaw): <https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=09.09.2021&Aktenzeichen=I+ZR+113%2F20>
- BGH, 27.11.2019 – VIII ZR 285/18 (LexFox / wenigermiete.de): <https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=101936&pos=0&anz=1>
- BGH press release on VIII ZR 285/18: <https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2019/2019153.html>
- § 2 RDG: <https://www.gesetze-im-internet.de/rdg/__2.html>
- § 6 RDG: <https://www.gesetze-im-internet.de/rdg/__6.html>
- Bundestag WD 7-111/19, *Rechtsdienstleistungsgesetz und Legal Tech*: <https://www.bundestag.de/resource/blob/654316/ad2c5f4740d04d817ba6f7b6f18074cf/WD-7-111-19-pdf-data.pdf>
