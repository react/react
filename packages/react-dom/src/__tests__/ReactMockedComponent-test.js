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
let act;

let MockedComponent;
let ReactDOMServer;

describe('ReactMockedComponent', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ReactDOMServer = require('react-dom/server');
    act = require('internal-test-utils').act;

    MockedComponent = class extends React.Component {
      render() {
        throw new Error('Should not get here.');
      }
    };
    // This is close enough to what a Jest mock would give us.
    MockedComponent.prototype.render = jest.fn();
  });

  it('should allow a mocked component to be rendered', async () => {
    const container = document.createElement('container');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<MockedComponent />);
    });
  });

  it('should allow a mocked component to be updated in dev', async () => {
    const container = document.createElement('container');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<MockedComponent />);
    });
    await act(() => {
      root.render(<MockedComponent />);
    });
  });

  it('should allow a mocked component to be rendered in dev (SSR)', () => {
    ReactDOMServer.renderToString(<MockedComponent />);
  });
});
