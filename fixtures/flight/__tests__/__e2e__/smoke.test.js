import {test, expect} from '@playwright/test';

test('smoke test', async ({page}) => {
  const consoleErrors = [];
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'warn' || type === 'error') {
      consoleErrors.push({type: type, text: msg.text()});
    }
  });
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.stack);
  });
  await page.goto('/');
  await expect(page.getByTestId('promise-as-a-child-test')).toHaveText(
    'Promise as a child hydrates without errors: deferred text'
  );
  await expect(page.getByTestId('prerendered')).not.toBeAttached();

  await expect(consoleErrors).toEqual([]);
  await expect(pageErrors).toEqual([]);

  await page.goto('/prerender');
  await expect(page.getByTestId('prerendered')).toBeAttached();

  await expect(consoleErrors).toEqual([]);
  await expect(pageErrors).toEqual([]);
});
