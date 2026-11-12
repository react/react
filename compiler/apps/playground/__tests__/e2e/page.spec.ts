/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {expect, test, type Page} from '@playwright/test';
import {encodeStore, type Store} from '../../lib/stores';
import {defaultConfig} from '../../lib/defaultStore';
import {format} from 'prettier';

function isMonacoLoaded(): boolean {
  return (
    typeof window['MonacoEnvironment'] !== 'undefined' &&
    window['__MONACO_LOADED__'] === true
  );
}

function formatPrint(data: Array<string>): Promise<string> {
  return format(data.join(''), {parser: 'babel'});
}

async function expandConfigs(page: Page): Promise<void> {
  const expandButton = page.locator('[title="Expand config editor"]');
  await expandButton.click();
  await page.waitForSelector('.monaco-editor-config', {state: 'visible'});
}

const TEST_SOURCE = `export default function TestComponent({ x }) {
  return <Button>{x}</Button>;
}`;

const TEST_CASE_INPUTS = [
  {
    name: 'module-scope-use-memo',
    input: `
'use memo';
export default function TestComponent({ x }) {
  return <Button>{x}</Button>;
}`,
  },
  {
    name: 'module-scope-use-no-memo',
    input: `
'use no memo';
export default function TestComponent({ x }) {
  return <Button>{x}</Button>;
}`,
  },
  {
    name: 'use-memo',
    input: `
function TestComponent({ x }) {
  'use memo';
  return <Button>{x}</Button>;
}
const TestComponent2 = ({ x }) => {
  'use memo';
  return <Button>{x}</Button>;
};`,
  },
  {
    name: 'use-no-memo',
    input: `
const TestComponent = function() {
  'use no memo';
  return <Button>{x}</Button>;
};
const TestComponent2 = ({ x }) => {
  'use no memo';
  return <Button>{x}</Button>;
};`,
  },
  {
    name: 'todo-function-scope-does-not-beat-module-scope',
    input: `
'use no memo';
function TestComponent({ x }) {
  'use memo';
  return <Button>{x}</Button>;
}`,
  },
  {
    name: 'parse-typescript',
    input: `
function Foo() {
  const x = foo() as number;
  return <div>{x}</div>;
}
`,
    noFormat: true,
  },
  {
    name: 'parse-flow',
    input: `
// @flow
function useFoo(propVal: {+baz: number}) {
  return <div>{(propVal.baz as number)}</div>;
}
    `,
    noFormat: true,
  },
  {
    name: 'compilationMode-infer',
    input: `// @compilationMode:"infer"
function nonReactFn() {
  return {};
}
    `,
    noFormat: true,
  },
  {
    name: 'compilationMode-all',
    input: `// @compilationMode:"all"
function nonReactFn() {
  return {};
}
    `,
    noFormat: true,
  },
];

test('editor should open successfully', async ({page}) => {
  await page.goto(`/`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);
  await page.screenshot({
    fullPage: true,
    path: 'test-results/00-fresh-page.png',
  });
});

test('editor should compile from hash successfully', async ({page}) => {
  const store: Store = {
    source: TEST_SOURCE,
    config: defaultConfig,
    showInternals: false,
  };
  const hash = encodeStore(store);
  await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);

  // User input from hash compiles
  await page.screenshot({
    fullPage: true,
    path: 'test-results/01-compiles-from-hash.png',
  });
  const text =
    (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
  const output = await formatPrint(text);

  expect(output).not.toEqual('');
  expect(output).toMatchSnapshot('01-user-output.txt');
});

test('reset button works', async ({page}) => {
  const store: Store = {
    source: TEST_SOURCE,
    config: defaultConfig,
    showInternals: false,
  };
  const hash = encodeStore(store);
  await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);

  // Reset button works
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Reset'}).click();
  await expandConfigs(page);

  await page.screenshot({
    fullPage: true,
    path: 'test-results/02-reset-button-works.png',
  });
  const text =
    (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
  const output = await formatPrint(text);

  const configText =
    (await page.locator('.monaco-editor-config').allInnerTexts()) ?? [];
  const configOutput = configText.join('');

  expect(output).not.toEqual('');
  expect(output).toMatchSnapshot('02-default-output.txt');
  expect(configOutput).not.toEqual('');
  expect(configOutput).toMatchSnapshot('default-config.txt');
});

test('defaults load when only source is in Store', async ({page}) => {
  // Test for backwards compatibility
  const partial = {
    source: TEST_SOURCE,
  };
  const hash = encodeStore(partial as Store);
  await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);
  await expandConfigs(page);

  await page.screenshot({
    fullPage: true,
    path: 'test-results/03-missing-defaults.png',
  });

  // Config editor has default config
  const configText =
    (await page.locator('.monaco-editor-config').allInnerTexts()) ?? [];
  const configOutput = configText.join('');

  expect(configOutput).not.toEqual('');
  expect(configOutput).toMatchSnapshot('default-config.txt');

  const checkbox = page.locator('label.show-internals');
  await expect(checkbox).not.toBeChecked();
  const ssaTab = page.locator('text=SSA');
  await expect(ssaTab).not.toBeVisible();
});

test('show internals button toggles correctly', async ({page}) => {
  await page.goto(`/`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);

  // show internals should be off
  const checkbox = page.locator('label.show-internals');
  await checkbox.click();

  await page.screenshot({
    fullPage: true,
    path: 'test-results/04-show-internals-on.png',
  });

  await expect(checkbox).toBeChecked();

  const ssaTab = page.locator('text=SSA');
  await expect(ssaTab).toBeVisible();
});

test('error is displayed when config has syntax error', async ({page}) => {
  const store: Store = {
    source: TEST_SOURCE,
    config: `{ compilationMode: }`,
    showInternals: false,
  };
  const hash = encodeStore(store);
  await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);
  await expandConfigs(page);
  await page.screenshot({
    fullPage: true,
    path: 'test-results/05-config-syntax-error.png',
  });

  const text =
    (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
  const output = text.join('');

  // Remove hidden chars
  expect(output.replace(/\s+/g, ' ')).toContain(
    'Unexpected failure when transforming configs',
  );
});

test('error is displayed when config has validation error', async ({page}) => {
  const store: Store = {
    source: TEST_SOURCE,
    config: `{
  compilationMode: "123"
}`,
    showInternals: false,
  };
  const hash = encodeStore(store);
  await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
  await page.waitForFunction(isMonacoLoaded);
  await expandConfigs(page);
  await page.screenshot({
    fullPage: true,
    path: 'test-results/06-config-validation-error.png',
  });

  const text =
    (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
  const output = text.join('');

  expect(output.replace(/\s+/g, ' ')).toContain('Unexpected compilationMode');
});

test('error is displayed when source has syntax error', async ({page}) => {
  const syntaxErrorSource = `function TestComponent(props) {
  const oops = props.
  return (
    <>{oops}</>
  );
}`;
  const store: Store = {
    source: syntaxErrorSource,
    config: defaultConfig,
    showInternals: false,
  };
  const hash = encodeStore(store);
  await page.goto(`/#${hash}`);
  await page.waitForFunction(isMonacoLoaded);
  await expandConfigs(page);
  await page.screenshot({
    fullPage: true,
    path: 'test-results/08-source-syntax-error.png',
  });

  const text =
    (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
  const output = text.join('');

  expect(output.replace(/\s+/g, ' ')).toContain(
    'Expected identifier to be defined before being used',
  );
});

TEST_CASE_INPUTS.forEach((t, idx) =>
  test(`playground compiles: ${t.name}`, async ({page}) => {
    const store: Store = {
      source: t.input,
      config: defaultConfig,
      showInternals: false,
    };
    const hash = encodeStore(store);
    await page.goto(`/#${hash}`, {waitUntil: 'networkidle'});
    await page.waitForFunction(isMonacoLoaded);
    await page.screenshot({
      fullPage: true,
      path: `test-results/08-0${idx}-${t.name}.png`,
    });

    const text =
      (await page.locator('.monaco-editor-output').allInnerTexts()) ?? [];
    let output: string;
    if (t.noFormat) {
      output = text.join('');
    } else {
      output = await formatPrint(text);
    }

    expect(output).not.toEqual('');
    expect(output).toMatchSnapshot(`${t.name}-output.txt`);
  }),
);
