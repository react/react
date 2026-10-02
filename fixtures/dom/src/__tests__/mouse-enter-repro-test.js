/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// Keep the reproduction focused on the fixture's nested-root setup.
jest.mock('../components/TestCase', () => {
  const React = require('react');
  function TestCase({children}) {
    return React.createElement('div', null, children);
  }
  TestCase.Steps = TestCase;
  TestCase.ExpectedResult = TestCase;
  return TestCase;
});

describe('Mouse Enter fixture', () => {
  [false, true].forEach(strictMode => {
    it(`mounts, handles events, and cleans up nested roots (StrictMode: ${strictMode})`, async () => {
      const React = require('react');
      const ReactDOM = require('react-dom');
      const ReactDOMClient = require('react-dom/client');
      const {act} = React;
      const previousActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
      global.IS_REACT_ACT_ENVIRONMENT = true;
      window.React = React;
      window.ReactDOM = ReactDOM;
      window.ReactDOMClient = ReactDOMClient;

      const MouseEnter =
        require('../components/fixtures/mouse-events/mouse-enter').default;
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      const nestedRoots = [];
      const originalCreateRoot = ReactDOMClient.createRoot;
      const createRoot = jest
        .spyOn(ReactDOMClient, 'createRoot')
        .mockImplementation(node => {
          const nestedRoot = originalCreateRoot(node);
          nestedRoots.push(nestedRoot);
          return nestedRoot;
        });
      const unmountOrder = [];

      try {
        await act(async () => {
          const fixture = React.createElement(MouseEnter);
          root.render(
            strictMode
              ? React.createElement(React.StrictMode, null, fixture)
              : fixture
          );
          await Promise.resolve();
        });

        expect(
          container.textContent.match(/Mouse enter call count:/g)
        ).toHaveLength(2);
        expect(createRoot).toHaveBeenCalledTimes(2);

        const boxes = Array.from(container.querySelectorAll('div')).filter(
          node =>
            node.firstChild &&
            node.firstChild.nodeType === 3 &&
            node.firstChild.nodeValue.startsWith('Mouse enter call count:')
        );
        expect(boxes).toHaveLength(2);
        for (const box of boxes) {
          await act(async () => {
            box.dispatchEvent(
              new MouseEvent('mouseover', {
                bubbles: true,
                relatedTarget: null,
              })
            );
          });
          expect(box.textContent).toBe('Mouse enter call count: 1');
        }

        nestedRoots.forEach((nestedRoot, index) => {
          const unmount = nestedRoot.unmount.bind(nestedRoot);
          jest.spyOn(nestedRoot, 'unmount').mockImplementation(() => {
            unmountOrder.push(index);
            unmount();
          });
        });
        await act(async () => {
          root.unmount();
          await Promise.resolve();
        });
        expect(unmountOrder).toEqual([1, 0]);
        expect(container.childNodes).toHaveLength(0);
      } finally {
        await act(async () => {
          root.unmount();
          await Promise.resolve();
        });
        createRoot.mockRestore();
        delete window.React;
        delete window.ReactDOM;
        delete window.ReactDOMClient;
        global.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    });
  });
});
