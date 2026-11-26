import fs from 'node:fs';
import {type Page, expect, test} from '@playwright/test';
import {
  createEditor,
  expectNoReload,
  testNoJs,
  waitForHydration,
} from './helper';

test('basic', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
});

test('client component', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await page.getByRole('button', {name: 'Client Counter: 0'}).click();
  await page.getByRole('button', {name: 'Client Counter: 1'}).click();
});

test('server action @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await using _ = await expectNoReload(page);
  await testAction(page);
});

testNoJs('server action @nojs', async ({page}) => {
  await page.goto('./');
  await testAction(page);
});

async function testAction(page: Page) {
  await page.getByRole('button', {name: 'Server Counter: 0'}).click();
  await expect(
    page.getByRole('button', {name: 'Server Counter: 1'}),
  ).toBeVisible();
  await page.getByRole('button', {name: 'Server Reset'}).click();
  await expect(
    page.getByRole('button', {name: 'Server Counter: 0'}),
  ).toBeVisible();
}

testNoJs('module preload on ssr @build', async ({page}) => {
  await page.goto('./');
  const srcs = await Promise.all(
    (await page.locator(`head >> link[rel="modulepreload"]`).all()).map(s =>
      s.getAttribute('href'),
    ),
  );
  const viteManifest = JSON.parse(
    fs.readFileSync('dist/client/.vite/manifest.json', 'utf-8'),
  );
  const file =
    (process.env.TEST_BASE ? '/custom-base/' : '/') +
    viteManifest['src/routes/client.tsx'].file;
  expect(srcs).toContain(file);
});

test('client hmr @dev', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await page.getByRole('button', {name: 'Client Counter: 0'}).click();
  await expect(
    page.getByRole('button', {name: 'Client Counter: 1'}),
  ).toBeVisible();

  using editor = createEditor('src/routes/client.tsx');
  editor.edit(s => s.replace('Client Counter', 'Client [edit] Counter'));
  await expect(
    page.getByRole('button', {name: 'Client [edit] Counter: 1'}),
  ).toBeVisible();

  // check next ssr is also updated
  const res = await page.goto('/');
  expect(await res?.text()).toContain('Client [edit] Counter');
});

test('server hmr @dev', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await using _ = await expectNoReload(page);

  using editor = createEditor('src/routes/root.tsx');
  editor.edit(s => s.replace('Server Counter', 'Server [edit] Counter'));
  await expect(
    page.getByRole('button', {name: 'Server [edit] Counter: 0'}),
  ).toBeVisible();
});

test('useActionState @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await using _ = await expectNoReload(page);
  await testUseActionState(page);
});

testNoJs('useActionState @nojs', async ({page}) => {
  await page.goto('./');
  await testUseActionState(page);
});

async function testUseActionState(page: Page) {
  await expect(page.getByTestId('use-action-state')).toContainText(
    'test-useActionState: 0',
  );
  await page.getByTestId('use-action-state').click();
  await expect(page.getByTestId('use-action-state')).toContainText(
    'test-useActionState: 1',
  );
}

test('temporary references @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await page.getByRole('button', {name: 'test-temporary-reference'}).click();
  await expect(page.getByTestId('temporary-reference')).toContainText(
    'result: [server [client]]',
  );
});

test('hydrate while streaming @js', async ({page}) => {
  await page.goto('./suspense', {waitUntil: 'commit'});
  await waitForHydration(page);
  await expect(page.getByTestId('suspense')).toContainText('suspense-fallback');
  await expect(page.getByTestId('suspense')).toContainText('suspense-resolved');
});

test('css client @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await expect(page.locator('.test-style-client')).toHaveCSS(
    'color',
    'rgb(250, 150, 0)',
  );
});

testNoJs('css client @nojs', async ({page}) => {
  await page.goto('./');
  await expect(page.locator('.test-style-client')).toHaveCSS(
    'color',
    'rgb(250, 150, 0)',
  );
});

test('css client hmr @dev', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await using _ = await expectNoReload(page);
  using editor = createEditor('src/routes/client.css');
  editor.edit(s => s.replaceAll('rgb(250, 150, 0)', 'rgb(150, 250, 0)'));
  await expect(page.locator('.test-style-client')).toHaveCSS(
    'color',
    'rgb(150, 250, 0)',
  );
});

test('css server @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await expect(page.locator('.test-style-server')).toHaveCSS(
    'color',
    'rgb(0, 200, 100)',
  );
});

testNoJs('css server @nojs', async ({page}) => {
  await page.goto('./');
  await expect(page.locator('.test-style-server')).toHaveCSS(
    'color',
    'rgb(0, 200, 100)',
  );
});

test('css server hmr @dev', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await using _ = await expectNoReload(page);
  using editor = createEditor('src/routes/root.css');
  editor.edit(s => s.replaceAll('rgb(0, 200, 100)', 'rgb(0, 100, 200)'));
  await expect(page.locator('.test-style-server')).toHaveCSS(
    'color',
    'rgb(0, 100, 200)',
  );
});

test('test serialization @js', async ({page}) => {
  await page.goto('./');
  await waitForHydration(page);
  await expect(page.getByTestId('serialization')).toHaveText('?');
  await page.getByTestId('serialization').click();
  await expect(page.getByTestId('serialization')).toHaveText('ok');
});
