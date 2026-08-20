/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// TODO: can we express this test with only public API?
const getNodeForCharacterOffset =
  require('react-dom-bindings/src/client/getNodeForCharacterOffset').default;

// Create node from HTML string
function createNode(html) {
  const node = (getTestDocument() || document).createElement('div');
  node.innerHTML = html;
  return node;
}

function getTestDocument(markup) {
  const doc = document.implementation.createHTMLDocument('');
  doc.open();
  doc.write(
    markup ||
      '<!doctype html><html><meta charset=utf-8><title>test doc</title>',
  );
  doc.close();
  return doc;
}

// Check getNodeForCharacterOffset return value matches expected result.
function expectNodeOffset(result, textContent, nodeOffset) {
  expect(result.node.textContent).toBe(textContent);
  expect(result.offset).toBe(nodeOffset);
}

describe('getNodeForCharacterOffset', () => {
  it('should handle siblings', () => {
    const node = createNode('<i>123</i><i>456</i><i>789</i>');

    expectNodeOffset(getNodeForCharacterOffset(node, 0), '123', 0);
    expectNodeOffset(getNodeForCharacterOffset(node, 4), '456', 1);
  });

  it('should handle trailing chars', () => {
    const node = createNode('<i>123</i><i>456</i><i>789</i>');

    expectNodeOffset(getNodeForCharacterOffset(node, 3), '123', 3);
    expectNodeOffset(getNodeForCharacterOffset(node, 9), '789', 3);
  });

  it('should handle trees', () => {
    const node = createNode(
      '<i>' +
        '<i>1</i>' +
        '<i>' +
        '<i>' +
        '<i>2</i>' +
        '<i></i>' +
        '</i>' +
        '</i>' +
        '<i>' +
        '3' +
        '<i>45</i>' +
        '</i>' +
        '</i>',
    );

    expectNodeOffset(getNodeForCharacterOffset(node, 3), '3', 1);
    expectNodeOffset(getNodeForCharacterOffset(node, 5), '45', 2);
    expect(getNodeForCharacterOffset(node, 10)).toBeUndefined();
  });

  it('should handle non-existent offset', () => {
    const node = createNode('<i>123</i>');

    expect(getNodeForCharacterOffset(node, -1)).toBeUndefined();
    expect(getNodeForCharacterOffset(node, 4)).toBeUndefined();
  });
});
