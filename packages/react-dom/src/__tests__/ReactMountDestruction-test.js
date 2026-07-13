/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const ReactDOMClient = require('react-dom/client');
const act = require('internal-test-utils').act;
const assertConsoleErrorDev =
  require('internal-test-utils').assertConsoleErrorDev;

describe('ReactMount', () => {
  it('should destroy a react root upon request', async () => {
    const mainContainerDiv = document.createElement('div');
    document.body.appendChild(mainContainerDiv);

    const instanceOne = <div className="firstReactDiv" />;
    const firstRootDiv = document.createElement('div');
    mainContainerDiv.appendChild(firstRootDiv);
    const firstRoot = ReactDOMClient.createRoot(firstRootDiv);
    await act(() => {
      firstRoot.render(instanceOne);
    });

    const instanceTwo = <div className="secondReactDiv" />;
    const secondRootDiv = document.createElement('div');
    mainContainerDiv.appendChild(secondRootDiv);
    const secondRoot = ReactDOMClient.createRoot(secondRootDiv);
    await act(() => {
      secondRoot.render(instanceTwo);
    });

    // Test that two react roots are rendered in isolation
    expect(firstRootDiv.firstChild.className).toBe('firstReactDiv');
    expect(secondRootDiv.firstChild.className).toBe('secondReactDiv');

    // Test that after unmounting each, they are no longer in the document.
    await act(() => {
      firstRoot.unmount();
    });
    expect(firstRootDiv.firstChild).toBeNull();
    await act(() => {
      secondRoot.unmount();
    });
  });

  // @gate !disableLegacyMode
  it('should warn when unmounting a non-container root node', () => {
    const mainContainerDiv = document.createElement('div');

    const component = (
      <div>
        <div />
      </div>
    );
    // Cannot be migrated to createRoot until we remove unmountComponentAtNode i.e. remove this test.
    ReactDOM.render(component, mainContainerDiv);

    // Test that unmounting at a root node gives a helpful warning
    const rootDiv = mainContainerDiv.firstChild;
    ReactDOM.unmountComponentAtNode(rootDiv);
    assertConsoleErrorDev([
      "unmountComponentAtNode(): The node you're attempting to " +
        'unmount was rendered by React and is not a top-level container. You ' +
        'may have accidentally passed in a React root node instead of its ' +
        'container.',
    ]);
  });

  // @gate !disableLegacyMode
  it('should warn when unmounting a non-container, non-root node', () => {
    const mainContainerDiv = document.createElement('div');

    const component = (
      <div>
        <div>
          <div />
        </div>
      </div>
    );
    // Cannot be migrated to createRoot until we remove unmountComponentAtNode i.e. remove this test.
    ReactDOM.render(component, mainContainerDiv);

    // Test that unmounting at a non-root node gives a different warning
    const nonRootDiv = mainContainerDiv.firstChild.firstChild;
    ReactDOM.unmountComponentAtNode(nonRootDiv);
    assertConsoleErrorDev([
      "unmountComponentAtNode(): The node you're attempting to " +
        'unmount was rendered by React and is not a top-level container. ' +
        'Instead, have the parent component update its state and rerender in ' +
        'order to remove this component.',
    ]);
  });
});
