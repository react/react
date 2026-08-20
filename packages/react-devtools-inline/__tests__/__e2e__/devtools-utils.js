'use strict';

/** @flow */

async function clickButton(page, buttonTestName) {
  await page.evaluate(testName => {
    const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
    const container = document.getElementById('devtools');

    const button = findAllNodes(container, [
      createTestNameSelector(testName),
    ])[0];
    button.click();
  }, buttonTestName);
}

async function getElementCount(page, displayName) {
  return await page.evaluate(listItemText => {
    const {createTestNameSelector, createTextSelector, findAllNodes} =
      window.REACT_DOM_DEVTOOLS;
    const container = document.getElementById('devtools');
    const rows = findAllNodes(container, [
      createTestNameSelector('ComponentTreeListItem'),
      createTextSelector(listItemText),
    ]);
    return rows.length;
  }, displayName);
}

async function selectElement(
  page,
  displayName,
  waitForOwnersText,
  waitForSourceLoaded = false
) {
  await page.evaluate(listItemText => {
    const {createTestNameSelector, createTextSelector, findAllNodes} =
      window.REACT_DOM_DEVTOOLS;
    const container = document.getElementById('devtools');

    const listItem = findAllNodes(container, [
      createTestNameSelector('ComponentTreeListItem'),
      createTextSelector(listItemText),
    ])[0];

    listItem.dispatchEvent(
      new MouseEvent('mousedown', {bubbles: true, cancelable: true})
    );
  }, displayName);

  if (waitForOwnersText) {
    // Wait for selected element's props to load.
    await page.waitForFunction(
      ({titleText, ownersListText}) => {
        const {createTestNameSelector, findAllNodes} =
          window.REACT_DOM_DEVTOOLS;
        const container = document.getElementById('devtools');

        const title = findAllNodes(container, [
          createTestNameSelector('InspectedElement-Title'),
        ])[0];

        const ownersList = findAllNodes(container, [
          createTestNameSelector('InspectedElementView-Owners'),
        ])[0];

        if (!ownersList) {
          return false;
        }

        const owners = findAllNodes(ownersList, [
          createTestNameSelector('OwnerView'),
        ]);

        return (
          title &&
          title.innerText.includes(titleText) &&
          owners &&
          owners
            .map(node => node.innerText)
            .join('\n')
            .includes(ownersListText)
        );
      },
      {titleText: displayName, ownersListText: waitForOwnersText}
    );
  }

  if (waitForSourceLoaded) {
    await page.waitForFunction(() => {
      const {createTestNameSelector, findAllNodes} = window.REACT_DOM_DEVTOOLS;
      const container = document.getElementById('devtools');

      const sourceStringBlock = findAllNodes(container, [
        createTestNameSelector('InspectedElementView-FormattedSourceString'),
      ])[0];

      // Wait for a new source line to be fetched
      return sourceStringBlock != null && sourceStringBlock.innerText != null;
    });
  }
}

module.exports = {
  clickButton,
  getElementCount,
  selectElement,
};
