/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOMClient;
let ReactDOMSelection;
let act;

let getModernOffsetsFromPoints;

describe('ReactDOMSelection', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMSelection = require('react-dom-bindings/src/client/ReactDOMSelection');
    act = require('internal-test-utils').act;

    ({getModernOffsetsFromPoints} = ReactDOMSelection);
  });

  // Simple implementation to compare correctness. React's old implementation of
  // this logic used DOM Range objects and is available for manual testing at
  // https://gist.github.com/sophiebits/2e6d571f4f10f33b62ea138a6e9c265c.
  function simpleModernOffsetsFromPoints(
    outerNode,
    anchorNode,
    anchorOffset,
    focusNode,
    focusOffset,
  ) {
    let start;
    let end;
    let length = 0;

    function traverse(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node === anchorNode) {
          start = length + anchorOffset;
        }
        if (node === focusNode) {
          end = length + focusOffset;
        }
        length += node.nodeValue.length;
        return;
      }

      for (let i = 0; true; i++) {
        if (node === anchorNode && i === anchorOffset) {
          start = length;
        }
        if (node === focusNode && i === focusOffset) {
          end = length;
        }
        if (i === node.childNodes.length) {
          break;
        }
        const n = node.childNodes[i];
        traverse(n);
      }
    }
    traverse(outerNode);

    if (start === null || end === null) {
      throw new Error('Provided anchor/focus nodes were outside of root.');
    }
    return {start, end};
  }

  // Complicated example derived from a real-world DOM tree. Has a bit of
  // everything.
  async function getFixture() {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <div>
            <div>
              <div>xxxxxxxxxxxxxxxxxxxx</div>
            </div>
            x
            <div>
              <div>
                x
                <div>
                  <div>
                    <div>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</div>
                    <div />
                    <div />
                    <div>xxxxxxxxxxxxxxxxxx</div>
                  </div>
                </div>
              </div>
            </div>
            <div />
          </div>
          <div>
            <div>
              <div>
                <div>xxxx</div>
                <div>xxxxxxxxxxxxxxxxxxx</div>
              </div>
            </div>
            <div>xxx</div>
            <div>xxxxx</div>
            <div>xxx</div>
            <div>
              <div>
                <div>
                  <div>{['x', 'x', 'xxx']}</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div>xxxxxx</div>
          </div>
        </div>,
      );
    });
    return container.firstChild;
  }

  it('returns correctly for base case', () => {
    const node = document.createElement('div');
    expect(getModernOffsetsFromPoints(node, node, 0, node, 0)).toEqual({
      start: 0,
      end: 0,
    });
    expect(simpleModernOffsetsFromPoints(node, node, 0, node, 0)).toEqual({
      start: 0,
      end: 0,
    });
  });

  it('returns correctly for fuzz test', async () => {
    const fixtureRoot = await getFixture();
    const allNodes = [fixtureRoot].concat(
      Array.from(fixtureRoot.querySelectorAll('*')),
    );
    expect(allNodes.length).toBe(27);
    allNodes.slice().forEach(element => {
      // Add text nodes.
      allNodes.push(
        ...Array.from(element.childNodes).filter(n => n.nodeType === 3),
      );
    });
    expect(allNodes.length).toBe(41);

    function randomNode() {
      return allNodes[(Math.random() * allNodes.length) | 0];
    }
    function randomOffset(node) {
      return (
        (Math.random() *
          (1 +
            (node.nodeType === 3 ? node.nodeValue : node.childNodes).length)) |
        0
      );
    }

    for (let i = 0; i < 2000; i++) {
      const anchorNode = randomNode();
      const anchorOffset = randomOffset(anchorNode);
      const focusNode = randomNode();
      const focusOffset = randomOffset(focusNode);

      const offsets1 = getModernOffsetsFromPoints(
        fixtureRoot,
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
      );
      const offsets2 = simpleModernOffsetsFromPoints(
        fixtureRoot,
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
      );
      if (JSON.stringify(offsets1) !== JSON.stringify(offsets2)) {
        throw new Error(
          JSON.stringify(offsets1) +
            ' does not match ' +
            JSON.stringify(offsets2) +
            ' for anchorNode=allNodes[' +
            allNodes.indexOf(anchorNode) +
            '], anchorOffset=' +
            anchorOffset +
            ', focusNode=allNodes[' +
            allNodes.indexOf(focusNode) +
            '], focusOffset=' +
            focusOffset,
        );
      }
    }
  });
});
