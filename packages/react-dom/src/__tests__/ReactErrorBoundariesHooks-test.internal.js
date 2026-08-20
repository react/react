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

describe('ReactErrorBoundariesHooks', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
  });

  it('should preserve hook order if errors are caught', async () => {
    function ErrorThrower() {
      React.useMemo(() => undefined, []);
      throw new Error('expected');
    }

    function StatefulComponent() {
      React.useState(null);
      return ' | stateful';
    }

    class ErrorHandler extends React.Component {
      state = {error: null};

      componentDidCatch(error) {
        return this.setState({error});
      }

      render() {
        if (this.state.error !== null) {
          return <p>Handled error: {this.state.error.message}</p>;
        }
        return this.props.children;
      }
    }

    function App(props) {
      return (
        <React.Fragment>
          <ErrorHandler>
            <ErrorThrower />
          </ErrorHandler>
          <StatefulComponent />
        </React.Fragment>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    await expect(
      act(() => {
        root.render(<App />);
      }),
    ).resolves.not.toThrow();
  });
});
