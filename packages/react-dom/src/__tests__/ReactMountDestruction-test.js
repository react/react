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
const ReactDOMClient = require('react-dom/client');
const act = require('internal-test-utils').act;

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
});
