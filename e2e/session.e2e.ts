import {
  T,
  answerScreen,
  escapeRegExp,
  expect,
  goForward,
  reportMarker,
  savedSession,
  settle,
  start,
  test,
} from './helpers';

const question = (page: import('@playwright/test').Page) =>
  page.locator('main fieldset legend span').first();

// AC5
test('resume offer, carry on, start fresh', async ({ page }) => {
  await start(page);
  await goForward(page); // situation
  await answerScreen(page);
  const firstQuestion = await question(page).textContent();
  await goForward(page);
  const secondQuestion = await question(page).textContent();
  expect(secondQuestion).not.toBe(firstQuestion);
  expect(await savedSession(page)).not.toBeNull();

  // A closed tab, then a new visit.
  await page.reload();
  await expect(page.getByText(T('resumeTitle'))).toBeVisible();
  await page.getByRole('button', { name: T('resumeContinue'), exact: true }).click();
  await expect(question(page)).toHaveText(secondQuestion!);

  // The earlier answer is still there.
  await page.getByRole('button', { name: new RegExp(`${escapeRegExp(T('back'))}$`) }).click();
  await expect(question(page)).toHaveText(firstQuestion!);
  await expect(page.locator('main input[type=radio]:checked')).toHaveCount(1);

  // Start fresh deletes the saved answers.
  await page.reload();
  await page.getByRole('button', { name: T('resumeFresh'), exact: true }).click();
  await expect(page.getByText(T('resumeTitle'))).toBeHidden();
  expect(await savedSession(page)).toBeNull();
});

// AC6
test('erase removes the answers and keeps them gone', async ({ page }) => {
  await start(page);
  await goForward(page); // situation
  await answerScreen(page);
  await page.getByRole('button', { name: T('stopEarly') }).click();
  await expect(reportMarker(page)).toBeVisible();
  expect(await savedSession(page)).not.toBeNull();

  await page.getByRole('button', { name: T('erase'), exact: true }).click();
  await expect(page.getByText(T('erased'), { exact: true })).toBeVisible();
  expect(await savedSession(page)).toBeNull();

  // A change on the report after erasing must not write the file back.
  // The shared-household question is on the report whatever the grade.
  await page.getByRole('button', { name: T('adjust'), exact: true }).click();
  const yes = page.getByRole('group', { name: T('sharedQ') }).getByRole('radio').first();
  await yes.check();
  await expect(yes).toBeChecked();
  await settle(page);
  expect(await savedSession(page)).toBeNull();

  // And the next visit offers nothing to resume.
  await page.reload();
  await expect(page.getByRole('button', { name: T('start'), exact: true })).toBeVisible();
  await expect(page.getByText(T('resumeTitle'))).toBeHidden();
});
