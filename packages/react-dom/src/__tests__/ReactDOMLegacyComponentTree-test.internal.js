/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

describe('ReactDOMComponentTree', () => {
  let React;
  let ReactDOM;
  let container;
  let assertConsoleErrorDev;

  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container = null;
  });

  // @gate !disableLegacyMode
  it('finds instance of node that is attempted to be unmounted', () => {
    const component = <div />;
    const node = ReactDOM.render(<div>{component}</div>, container);
    ReactDOM.unmountComponentAtNode(node);
    assertConsoleErrorDev([
      "unmountComponentAtNode(): The node you're attempting to unmount " +
        'was rendered by React and is not a top-level container. You may ' +
        'have accidentally passed in a React root node instead of its ' +
        'container.',
    ]);
  });

  // @gate !disableLegacyMode
  it('finds instance from node to stop rendering over other react rendered components', () => {
    const component = (
      <div>
        <span>Hello</span>
      </div>
    );
    const anotherComponent = <div />;
    const instance = ReactDOM.render(component, container);
    ReactDOM.render(anotherComponent, instance);
    assertConsoleErrorDev([
      'Replacing React-rendered children with a new root ' +
        'component. If you intended to update the children of this node, ' +
        'you should instead have the existing children update their state ' +
        'and render the new components instead of calling ReactDOM.render.',
    ]);
  });
});
