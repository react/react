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
let ReactDOM;
let ReactDOMClient;
let assertConsoleErrorDev;

describe('ReactCreateRef', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ({assertConsoleErrorDev} = require('internal-test-utils'));
  });

  it('should warn in dev if an invalid ref object is provided', () => {
    function Wrapper({children}) {
      return children;
    }

    class ExampleComponent extends React.Component {
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    ReactDOM.flushSync(() => {
      root.render(
        <Wrapper>
          <div ref={{}} />
        </Wrapper>,
      );
    });
    assertConsoleErrorDev([
      'Unexpected ref object provided for div. ' +
        'Use either a ref-setter function or React.createRef().\n' +
        '    in div (at **)',
    ]);

    ReactDOM.flushSync(() => {
      root.render(
        <Wrapper>
          <ExampleComponent ref={{}} />
        </Wrapper>,
      );
    });
    assertConsoleErrorDev([
      'Unexpected ref object provided for ExampleComponent. ' +
        'Use either a ref-setter function or React.createRef().\n' +
        '    in ExampleComponent (at **)',
    ]);
  });
});
