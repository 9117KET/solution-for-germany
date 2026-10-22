# Deploying

The app is a Next.js 16 app with one page, prerendered as static content. It is
deployed on Vercel. Production URL: [https://…]

## Vercel

The build command is `npm run build`. Nothing in the code is Vercel-specific.

Analytics are off unless three environment variables are set (a fourth is
optional). Set them in the project's settings on Vercel (Project Settings,
then Environment Variables), and scope each one to **Production only**. Leave Preview and
Development unset, so preview deployments and local runs send nothing.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `plausible` |
| `NEXT_PUBLIC_PLAUSIBLE_SRC` | The script URL from the Plausible dashboard (site settings, installation). The legacy `https://plausible.io/js/script.tagged-events.js` also works. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | The domain the site is registered under in Plausible |
| `NEXT_PUBLIC_PLAUSIBLE_ENDPOINT` | Optional. Only if events go through a proxy. |

`NEXT_PUBLIC_*` values are written into the JavaScript at build time, not read
when a page is served. Changing, adding or removing one has no effect until the
next deployment. After any change, redeploy production.

To switch analytics off again: delete the provider variable (or set it to
`none`) and redeploy.

A custom domain is added in the project's domain settings on Vercel. If the
domain changes, change `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and the site in Plausible
to match, then redeploy.

### Vercel Web Analytics is not used

Vercel has its own analytics. It is not implemented here. Custom events are on
the Pro and Enterprise plans only, and Pro allows 2 properties per event
(https://vercel.com/docs/analytics/custom-events,
https://vercel.com/docs/analytics/limits-and-pricing). On the Hobby plan it
would give page views only.

## Any other Node host

`npm ci`, then `npm run build`, then `npm run start` (port 3000 by default).
Set the same variables in the build environment, never in the runtime one, for
the reason above.

## Before switching analytics on

Do each of these, in order, and only then set the provider variable.

1. **Impressum and Datenschutzerklärung.** Both pages are being added in a
   separate spec. They must be live before analytics are enabled.
2. **Legal read.** The DSK Orientierungshilfe "Digitale Dienste" (v1.2,
   November 2024) gives no blanket consent exemption for reach measurement
   (Rn. 87-90). Even a plain visitor count depends on the concrete purpose
   (Rn. 90), and a consent-free finding holds only for a precisely defined
   configuration (Rn. 89). The partner, money band and questions band go
   beyond a plain count. Get a short legal read on this configuration before
   the production build sets the provider.
   Source: https://datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf
3. **Data processing agreements.** Conclude an Auftragsverarbeitungsvertrag
   with Plausible. Have Vercel's data processing agreement in place.
4. **Plausible plan.** Custom properties need Plausible's Business plan
   (https://plausible.io/docs/custom-props/introduction). Without them the
   events arrive with no language, pace or partner. Confirm at signup.
5. **Vercel plan.** The Hobby plan is for non-commercial personal use per
   Vercel's own docs. Partner links and analytics for organisations may need
   the Pro plan. Confirm against Vercel's fair-use text.
6. **EU data region.** Confirm in the Plausible dashboard that the site's data
   is stored in the EU.
7. **Plausible settings.** In the site's settings, keep these off: outbound
   link tracking, file download tracking, form submission tracking. Do not
   turn on sending the full URL as a property. The app also strips the query
   string itself, but the dashboard should not ask for more.
8. **Production only.** Check again that the three variables are scoped to
   Production, not Preview or Development.

## After the first deploy

Check each, and note the date.

- [ ] The app loads at the production URL.
- [ ] The browser console shows no errors on the welcome screen, a question and
      the report.
- [ ] With the provider unset: the network panel shows no request leaving the
      page to any host other than the site itself, through a full run to the
      PDF.
- [ ] With the provider set: Plausible shows the first page view.
- [ ] A visit to `[https://…]/?via=test` shows `?via=test` gone from the address
      bar at once, and the next event (press Start) appears under the
      `partner` property as `test`.
- [ ] The page view of that visit is recorded without `?via=test` in its URL.
- [ ] No cookie is set by the site (browser storage panel).
