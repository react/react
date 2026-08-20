/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment jsdom
 */

'use strict';

let React;
let ReactDOM;
let ReactDOMClient;
let ReactDebugTools;
let act;

function normalizeSourceLoc(tree) {
  tree.forEach(node => {
    if (node.hookSource) {
      node.hookSource.fileName = '**';
      node.hookSource.lineNumber = 0;
      node.hookSource.columnNumber = 0;
    }
    normalizeSourceLoc(node.subHooks);
  });
  return tree;
}

describe('ReactHooksInspectionIntegration', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    ReactDebugTools = require('react-debug-tools');
  });

  it('should support useFormStatus hook', async () => {
    function FormStatus() {
      const status = ReactDOM.useFormStatus();
      React.useMemo(() => 'memo', []);
      React.useMemo(() => 'not used', []);

      return JSON.stringify(status);
    }

    const treeWithoutFiber = ReactDebugTools.inspectHooks(FormStatus);
    expect(normalizeSourceLoc(treeWithoutFiber)).toEqual([
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: null,
        isStateEditable: false,
        name: 'FormStatus',
        subHooks: [],
        value: null,
      },
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: 0,
        isStateEditable: false,
        name: 'Memo',
        subHooks: [],
        value: 'memo',
      },
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: 1,
        isStateEditable: false,
        name: 'Memo',
        subHooks: [],
        value: 'not used',
      },
    ]);

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    await act(() => {
      root.render(
        <form>
          <FormStatus />
        </form>,
      );
    });

    // Implementation detail. Feel free to adjust the position of the Fiber in the tree.
    const formStatusFiber = root._internalRoot.current.child.child;
    const treeWithFiber = ReactDebugTools.inspectHooksOfFiber(formStatusFiber);
    expect(normalizeSourceLoc(treeWithFiber)).toEqual([
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: null,
        isStateEditable: false,
        name: 'FormStatus',
        subHooks: [],
        value: {
          action: null,
          data: null,
          method: null,
          pending: false,
        },
      },
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: 0,
        isStateEditable: false,
        name: 'Memo',
        subHooks: [],
        value: 'memo',
      },
      {
        debugInfo: null,
        hookSource: {
          columnNumber: 0,
          fileName: '**',
          functionName: 'FormStatus',
          lineNumber: 0,
        },
        id: 1,
        isStateEditable: false,
        name: 'Memo',
        subHooks: [],
        value: 'not used',
      },
    ]);
  });
});
