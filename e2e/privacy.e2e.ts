import { expect, reportMarker, runToReport, start, test } from './helpers';

// AC7. The promise in README: answers never leave the device. With analytics
// unset (the default build), nothing at all goes to another origin.
test('a full run talks to no other origin and sets no cookie', async ({ page, context, baseURL }) => {
  const own = new URL(baseURL!).origin;
  const foreign: string[] = [];
  // Every page, popup and worker in the browser context, not just this tab.
  context.on('request', (req) => {
    const url = new URL(req.url());
    // data: and blob: URLs never leave the browser.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== own) foreign.push(`${req.method()} ${url.origin}${url.pathname}`);
  });

  await start(page);
  await runToReport(page);
  const downloading = page.waitForEvent('download');
  await reportMarker(page).click();
  await downloading;

  expect(foreign, 'requests to any origin other than the app').toEqual([]);
  expect(await context.cookies(), 'cookies').toEqual([]);
});
