/** @flow */

'use strict';

const {runOnlyForReactRange} = require('./utils');
const listAppUtils = require('./list-app-utils');
const devToolsUtils = require('./devtools-utils');
const {test, expect} = require('@playwright/test');
const config = require('../../playwright.config');
const semver = require('semver');

test.use(config);
test.describe('Components', () => {
  let page;

  test.beforeEach(async ({browser}) => {
    page = await browser.newPage();

    await page.goto(config.use.url, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('#iframe');

    await devToolsUtils.clickButton(page, 'TabBarButton-components');
  });

  test('Should display initial React components', async () => {
    const appRowCount = await page.evaluate(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_APP;
      const container = document.getElementById('iframe').contentDocument;
      const rows = findAllNodes(container, [
        createTestNameSelector('ListItem'),
      ]);
      return rows.length;
    });
    expect(appRowCount).toBe(3);

    const devToolsRowCount = await devToolsUtils.getElementCount(
      page,
      'ListItem'
    );
    expect(devToolsRowCount).toBe(3);
  });

  test('Should display newly added React components', async () => {
    await listAppUtils.addItem(page, 'four');

    const count = await devToolsUtils.getElementCount(page, 'ListItem');
    expect(count).toBe(4);
  });

  test('Should allow elements to be inspected', async () => {
    // Select the first list item in DevTools.
    await devToolsUtils.selectElement(page, 'ListItem', '<List>\n<App>');

    // Prop names/values may not be editable based on the React version.
    // If they're not editable, make sure they degrade gracefully
    const isEditableName = semver.gte(config.use.react_version, '17.0.0');
    const isEditableValue = semver.gte(config.use.react_version, '16.8.0');

    // Then read the inspected values.
    const {
      name: propName,
      value: propValue,
      existingNameElementsSize,
      existingValueElementsSize,
    } = await page.evaluate(
      isEditable => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        // Get name of first prop
        const nameSelector = isEditable.name
          ? 'EditableName'
          : 'NonEditableName';
        // Get value of first prop
        const valueSelector = isEditable.value
          ? 'EditableValue'
          : 'NonEditableValue';

        const existingNameElements = findAllNodes(container, [
          createTestNameSelector('InspectedElementPropsTree'),
          createTestNameSelector('KeyValue'),
          createTestNameSelector(nameSelector),
        ]);
        const existingValueElements = findAllNodes(container, [
          createTestNameSelector('InspectedElementPropsTree'),
          createTestNameSelector('KeyValue'),
          createTestNameSelector(valueSelector),
        ]);

        const name = isEditable.name
          ? existingNameElements[0].value
          : existingNameElements[0].innerText
              // remove trailing colon
              .slice(0, -1);
        const value = isEditable.value
          ? existingValueElements[0].value
          : existingValueElements[0].innerText;

        return {
          name,
          value,
          existingNameElementsSize: existingNameElements.length,
          existingValueElementsSize: existingValueElements.length,
        };
      },
      {name: isEditableName, value: isEditableValue}
    );

    expect(existingNameElementsSize).toBe(1);
    expect(existingValueElementsSize).toBe(1);
    expect(propName).toBe('label');
    expect(propValue).toBe('"one"');
  });

  test('Should allow inspecting source of the element', async () => {
    // Source inspection is available only in modern renderer.
    runOnlyForReactRange('>=16.8');

    // Select the first list item in DevTools.
    await devToolsUtils.selectElement(page, 'ListItem', '<List>\n<App>', true);

    // Then read the inspected values.
    const sourceText = await page.evaluate(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');

      const source = findAllNodes(container, [
        createTestNameSelector('InspectedElementView-FormattedSourceString'),
      ])[0];

      return source.innerText;
    });

    // If React version is specified, the e2e-regression.html page will be used
    // If not, then e2e.html, see playwright.config.js, how url is constructed
    expect(sourceText).toMatch(/e2e-app[\-a-zA-Z]*\.js/);
  });

  test('should allow props to be edited', async () => {
    runOnlyForReactRange('>=16.8');

    // Select the first list item in DevTools.
    await devToolsUtils.selectElement(page, 'ListItem', '<List>\n<App>');

    // Then edit the label prop.
    await page.evaluate(() => {
      const {createTestNameSelector, focusWithin} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');

      focusWithin(container, [
        createTestNameSelector('InspectedElementPropsTree'),
        createTestNameSelector('KeyValue'),
        createTestNameSelector('EditableValue'),
      ]);
    });

    page.keyboard.press('Backspace'); // "
    page.keyboard.press('Backspace'); // e
    page.keyboard.press('Backspace'); // n
    page.keyboard.press('Backspace'); // o
    page.keyboard.insertText('new"');
    page.keyboard.press('Enter');

    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_APP;
      const container = document.getElementById('iframe').contentDocument;
      const rows = findAllNodes(container, [
        createTestNameSelector('ListItem'),
      ])[0];
      return rows.innerText === 'new';
    });
  });

  test('should load and parse hook names for the inspected element', async () => {
    runOnlyForReactRange('>=16.8');

    // Select the List component DevTools.
    await devToolsUtils.selectElement(page, 'List', '<App>');

    // Then click to load and parse hook names.
    await devToolsUtils.clickButton(page, 'LoadHookNamesButton');

    // Make sure the expected hook names are parsed and displayed eventually.
    await page.waitForFunction(
      hookNames => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        const hooksTree = findAllNodes(container, [
          createTestNameSelector('InspectedElementHooksTree'),
        ])[0];

        if (!hooksTree) {
          return false;
        }

        const hooksTreeText = hooksTree.innerText;

        for (let i = 0; i < hookNames.length; i++) {
          if (!hooksTreeText.includes(hookNames[i])) {
            return false;
          }
        }

        return true;
      },
      ['State(items)', 'Ref(inputRef)']
    );
  });

  test('should allow searching for component by name', async () => {
    async function waitForComponentSearchResultsCount(text) {
      return await page.waitForFunction(expectedElementText => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        // The current result index is an editable input, so its value is not
        // part of the wrapper's innerText. Combine the input value with the
        // total result count to reconstruct the "X | Y" label.
        const indexInput = findAllNodes(container, [
          createTestNameSelector('ComponentSearchInput-ResultIndexInput'),
        ])[0];
        const resultsCount = findAllNodes(container, [
          createTestNameSelector('ComponentSearchInput-ResultsCount'),
        ])[0];
        if (indexInput === undefined || resultsCount === undefined) {
          return false;
        }
        const totalCount = resultsCount.innerText.replace(/[^0-9]/g, '');
        return `${indexInput.value} | ${totalCount}` === expectedElementText;
      }, text);
    }

    async function focusComponentSearch() {
      await page.evaluate(() => {
        const {createTestNameSelector, focusWithin} = window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        focusWithin(container, [
          createTestNameSelector('ComponentSearchInput-Input'),
        ]);
      });
    }

    await focusComponentSearch();
    await page.keyboard.insertText('List');
    await waitForComponentSearchResultsCount('1 | 4');

    await page.keyboard.insertText('Item');
    await waitForComponentSearchResultsCount('1 | 3');

    await page.keyboard.press('Enter');
    await waitForComponentSearchResultsCount('2 | 3');

    await page.keyboard.press('Enter');
    await waitForComponentSearchResultsCount('3 | 3');

    await page.keyboard.press('Enter');
    await waitForComponentSearchResultsCount('1 | 3');

    await page.keyboard.press('Shift+Enter');
    await waitForComponentSearchResultsCount('3 | 3');

    await page.keyboard.press('Shift+Enter');
    await waitForComponentSearchResultsCount('2 | 3');

    await page.keyboard.press('Shift+Enter');
    await waitForComponentSearchResultsCount('1 | 3');
  });
});
