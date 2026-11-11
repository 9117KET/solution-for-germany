import { readFile } from 'node:fs/promises';
import { expect, pattern, reportMarker, runToReport, start, test } from './helpers';

// AC4
test('downloads a real PDF', async ({ page }) => {
  await start(page);
  await runToReport(page);

  const downloading = page.waitForEvent('download');
  await reportMarker(page).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const bytes = await readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');

  await expect(page.getByText(pattern('pdfSaved'))).toBeVisible();
});
