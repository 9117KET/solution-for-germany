import {
  T,
  answerScreen,
  expect,
  forward,
  goForward,
  pattern,
  reportMarker,
  runToReport,
  start,
  test,
} from './helpers';

// AC1, and AC9 in the webkit-phone project: Continue is checked to be on screen
// without scrolling before every press (goForward).
test('German, one question at a time, reaches the report', async ({ page }) => {
  await start(page, 'de');
  const screens = await runToReport(page, 'de');
  expect(screens).toBeGreaterThan(1);

  await expect(reportMarker(page)).toBeVisible();
  await expect(page.getByText(T('resultEyebrow'))).toBeVisible();
  // The honest headline for the method: how many of the 64 were asked.
  await expect(page.getByText(T('cardAnswered'))).toBeVisible();
  await expect(page.getByText('/64', { exact: true })).toBeVisible();
});

// AC2
test('Arabic interface is right to left, questions stay German or English', async ({ page }) => {
  await start(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  // Situation screen, then the first question.
  await goForward(page, 'ar');
  const question = page.locator('main fieldset legend span').first();
  await expect(question).toHaveAttribute('lang', /^(de|en)$/);
  await expect(question).toHaveAttribute('dir', 'ltr');

  await runToReport(page, 'ar');
  await expect(reportMarker(page, 'ar')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

// AC3
test('stopping early shows a range and offers the rest back', async ({ page }) => {
  await start(page, 'de');
  await goForward(page); // situation
  await answerScreen(page); // first question only
  await page.getByRole('button', { name: T('stopEarly') }).click();

  await expect(reportMarker(page)).toBeVisible();
  await expect(page.getByText(T('rangeBody'))).toBeVisible();

  await page.getByRole('button', { name: pattern('refineButton') }).click();
  // Back on a question, and it is one nobody has answered yet.
  await expect(forward(page)).toBeVisible();
  await expect(page.locator('main input[type=radio]:checked')).toHaveCount(0);
});
