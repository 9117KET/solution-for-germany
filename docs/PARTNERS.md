# Partner links

A partner organisation (a Pflegestützpunkt, a welfare association, a migrant
organisation) can hand out its own link to the app. Visits that start from that
link are counted under the organisation's short name, so it can see that its
families use the tool, and we can say which partners bring people to it.

This only does anything once analytics are switched on; see `DEPLOY.md`.

## Giving an organisation its link

1. Choose a slug: lower-case letters `a-z`, digits and hyphens, 1 to 40
   characters. For example `caritas-berlin` or `pflegestuetzpunkt-mitte`.
   Upper case is accepted and turned into lower case. Anything else (spaces,
   dots, underscores, umlauts, a 41st character) is silently ignored and the
   visit counts as `none`.
2. The link is `https://<domain>/?via=<slug>`, for example
   `[https://…]/?via=caritas-berlin`.
3. Keep a list of the slugs you have handed out and to whom. The app does not
   keep one.

What happens to the slug: the page checks it, takes `?via=…` out of the address
bar at once, and keeps the slug in memory for that page visit. Every event of
that visit carries it as the `partner` property. It is never written to the
device and never sent as part of a URL.

The partner link counts the visit it opens; if the family comes back later by
typing the address, that visit counts as direct. A reload or a new tab also
starts without it.

## Seeing an organisation's numbers

In the Plausible dashboard, filter by the custom property `partner` equal to the
slug. Custom properties need Plausible's Business plan; see `DEPLOY.md`.

To give the organisation its own view, Plausible offers shared links, public or
password-protected. A shared link can be limited to a saved segment, which the
viewer cannot remove but can filter further
(https://plausible.io/docs/shared-links). The plan is one segment per partner,
`partner` is the slug, and one shared link limited to it.

*To verify in the trial:* whether segments can filter on a custom property, and
on which plan. If they cannot, send the organisation a monthly figure by hand
instead of a link.

## What the numbers mean

- **Visits from the link.** People who opened the app through it. Not people
  helped: one family may open it twice, and one tablet in a counselling office
  may serve ten families.
- **`intake_started`.** Someone left the welcome screen.
- **`result_shown`.** Someone reached the estimate, with a band for how many
  questions they answered and for the monthly amount unclaimed. Not a grade,
  and not what they were awarded.
- **`questions_refined`.** Someone with a range rather than a single grade
  chose to answer more questions.
- **`pdf_downloaded`.** Someone took the result away as a file.
- **`intake_erased`.** Someone deleted their answers from the device.

What they do not mean: that anyone applied, that an application succeeded, or
how much money anyone received. The app cannot know any of that.

Small numbers are noisy. A partner with five visits a month should not be
compared with one that has fifty.

## What to tell partners about privacy

Partner numbers are aggregates with no personal data, and the slug names the
organisation, not a person.

A sentence they can pass on to families:

> The app counts how many people use it and how far they get, without cookies
> and without names. Your answers stay on your device and are never sent.
