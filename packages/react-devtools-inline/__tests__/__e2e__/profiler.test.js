/** @flow */

'use strict';

const {runOnlyForReactRange} = require('./utils');
const listAppUtils = require('./list-app-utils');
const devToolsUtils = require('./devtools-utils');
const {test, expect} = require('@playwright/test');
const config = require('../../playwright.config');
test.use(config);
test.describe('Profiler', () => {
  let page;

  test.beforeEach(async ({browser}) => {
    page = await browser.newPage();
    await page.goto(config.use.url, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('#iframe');

    await devToolsUtils.clickButton(page, 'TabBarButton-profiler');
  });

  test('should record renders and commits when active', async () => {
    // Profiling is only available in 16.5 and over
    runOnlyForReactRange('>=16.5');
    async function getSnapshotSelectorText() {
      return await page.evaluate(() => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        const input = findAllNodes(container, [
          createTestNameSelector('SnapshotSelector-Input'),
        ])[0];
        const label = findAllNodes(container, [
          createTestNameSelector('SnapshotSelector-Label'),
        ])[0];
        return `${input.value}${label.innerText}`;
      });
    }

    async function clickButtonAndVerifySnapshotSelectorText(
      buttonTagName,
      expectedText
    ) {
      await devToolsUtils.clickButton(page, buttonTagName);
      const text = await getSnapshotSelectorText();
      expect(text).toBe(expectedText);
    }

    await devToolsUtils.clickButton(page, 'ProfilerToggleButton');

    await listAppUtils.addItem(page, 'four');
    await listAppUtils.addItem(page, 'five');
    await listAppUtils.addItem(page, 'six');

    await devToolsUtils.clickButton(page, 'ProfilerToggleButton');

    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');

      const input = findAllNodes(container, [
        createTestNameSelector('SnapshotSelector-Input'),
      ]);

      return input.length === 1;
    });

    const text = await getSnapshotSelectorText();
    expect(text).toBe('1 / 3');

    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-NextButton',
      '2 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-NextButton',
      '3 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-NextButton',
      '1 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-PreviousButton',
      '3 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-PreviousButton',
      '2 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-PreviousButton',
      '1 / 3'
    );
    await clickButtonAndVerifySnapshotSelectorText(
      'SnapshotSelector-PreviousButton',
      '3 / 3'
    );
  });

  test('should allow searching for a component within the selected commit', async () => {
    runOnlyForReactRange('>=16.5');

    async function waitForSearchResultsCount(expectedText) {
      return await page.waitForFunction(expected => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        const indexInput = findAllNodes(container, [
          createTestNameSelector('ProfilerSearchInput-ResultIndexInput'),
        ])[0];
        const resultsCount = findAllNodes(container, [
          createTestNameSelector('ProfilerSearchInput-ResultsCount'),
        ])[0];
        if (indexInput === undefined || resultsCount === undefined) {
          return false;
        }
        const totalCount = resultsCount.innerText.replace(/[^0-9]/g, '');
        return `${indexInput.value} | ${totalCount}` === expected;
      }, expectedText);
    }

    async function focusProfilerSearch() {
      await page.evaluate(() => {
        const {createTestNameSelector, focusWithin} = window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        focusWithin(container, [
          createTestNameSelector('ProfilerSearchInput-Input'),
        ]);
      });
    }

    await devToolsUtils.clickButton(page, 'ProfilerToggleButton');
    await listAppUtils.addItem(page, 'four');
    await listAppUtils.addItem(page, 'five');
    await listAppUtils.addItem(page, 'six');
    await devToolsUtils.clickButton(page, 'ProfilerToggleButton');

    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');
      return (
        findAllNodes(container, [
          createTestNameSelector('SnapshotSelector-Input'),
        ]).length === 1
      );
    });

    await devToolsUtils.clickButton(page, 'ProfilerSearchButton');
    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');
      return (
        findAllNodes(container, [
          createTestNameSelector('ProfilerSearchInput-Input'),
        ]).length === 1
      );
    });

    await focusProfilerSearch();
    await page.keyboard.insertText('ListItem');
    await waitForSearchResultsCount('1 | 4');

    await devToolsUtils.clickButton(page, 'SnapshotSelector-NextButton');
    await waitForSearchResultsCount('1 | 5');
    await devToolsUtils.clickButton(page, 'SnapshotSelector-NextButton');
    await waitForSearchResultsCount('1 | 6');
    await devToolsUtils.clickButton(page, 'SnapshotSelector-PreviousButton');
    await waitForSearchResultsCount('1 | 5');
    await devToolsUtils.clickButton(page, 'SnapshotSelector-PreviousButton');
    await waitForSearchResultsCount('1 | 4');

    await page.keyboard.press('Enter');
    await waitForSearchResultsCount('2 | 4');
    await page.keyboard.press('Enter');
    await waitForSearchResultsCount('3 | 4');
    await page.keyboard.press('Enter');
    await waitForSearchResultsCount('4 | 4');
    await page.keyboard.press('Enter');
    await waitForSearchResultsCount('1 | 4');
    await page.keyboard.press('Shift+Enter');
    await waitForSearchResultsCount('4 | 4');

    await page.keyboard.insertText('zzz');
    await waitForSearchResultsCount('0 | 0');

    await devToolsUtils.clickButton(page, 'ProfilerSearchInput-CloseButton');
    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');
      return (
        findAllNodes(container, [
          createTestNameSelector('ProfilerSearchInput-Input'),
        ]).length === 0
      );
    });
  });
});
