/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMServer;
let assertConsoleErrorDev;
let assertConsoleWarnDev;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  React = require('react');
  ReactDOMServer = require('react-dom/server');
  assertConsoleErrorDev = require('internal-test-utils').assertConsoleErrorDev;
  assertConsoleWarnDev = require('internal-test-utils').assertConsoleWarnDev;

  // Make them available to the helpers.
  return {
    ReactDOMServer,
  };
}

const {resetModules} = ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerLifecycles', () => {
  beforeEach(() => {
    resetModules();
  });

  it('should invoke the correct legacy lifecycle hooks', () => {
    const log = [];

    class Outer extends React.Component {
      UNSAFE_componentWillMount() {
        log.push('outer componentWillMount');
      }
      render() {
        log.push('outer render');
        return <Inner />;
      }
    }

    class Inner extends React.Component {
      UNSAFE_componentWillMount() {
        log.push('inner componentWillMount');
      }
      render() {
        log.push('inner render');
        return null;
      }
    }

    ReactDOMServer.renderToString(<Outer />);
    expect(log).toEqual([
      'outer componentWillMount',
      'outer render',
      'inner componentWillMount',
      'inner render',
    ]);
  });

  it('should invoke the correct new lifecycle hooks', () => {
    const log = [];

    class Outer extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        log.push('outer getDerivedStateFromProps');
        return null;
      }
      render() {
        log.push('outer render');
        return <Inner />;
      }
    }

    class Inner extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        log.push('inner getDerivedStateFromProps');
        return null;
      }
      render() {
        log.push('inner render');
        return null;
      }
    }

    ReactDOMServer.renderToString(<Outer />);
    expect(log).toEqual([
      'outer getDerivedStateFromProps',
      'outer render',
      'inner getDerivedStateFromProps',
      'inner render',
    ]);
  });

  it('should not invoke unsafe cWM if static gDSFP is present', () => {
    class Component extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      UNSAFE_componentWillMount() {
        throw Error('unexpected');
      }
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<Component />);
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n' +
        '\n' +
        'Component uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  UNSAFE_componentWillMount\n' +
        '\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in Component (at **)',
    ]);
  });

  it('should update instance.state with value returned from getDerivedStateFromProps', () => {
    class Grandparent extends React.Component {
      state = {
        foo: 'foo',
      };
      render() {
        return (
          <div>
            {`Grandparent: ${this.state.foo}`}
            <Parent />
          </div>
        );
      }
    }

    class Parent extends React.Component {
      state = {
        bar: 'bar',
        baz: 'baz',
      };
      static getDerivedStateFromProps(props, prevState) {
        return {
          bar: `not ${prevState.bar}`,
        };
      }
      render() {
        return (
          <div>
            {`Parent: ${this.state.bar}, ${this.state.baz}`}
            <Child />;
          </div>
        );
      }
    }

    class Child extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return {
          qux: 'qux',
        };
      }
      render() {
        return `Child: ${this.state.qux}`;
      }
    }

    const markup = ReactDOMServer.renderToString(<Grandparent />);
    expect(markup).toContain('Grandparent: foo');
    expect(markup).toContain('Parent: not bar, baz');
    expect(markup).toContain('Child: qux');
  });

  it('should warn if getDerivedStateFromProps returns undefined', () => {
    class Component extends React.Component {
      state = {};
      static getDerivedStateFromProps() {}
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<Component />);
    assertConsoleErrorDev([
      'Component.getDerivedStateFromProps(): A valid state object (or null) must ' +
        'be returned. You have returned undefined.\n' +
        '    in Component (at **)',
    ]);

    // De-duped
    ReactDOMServer.renderToString(<Component />);
  });

  it('should warn if state is not initialized before getDerivedStateFromProps', () => {
    class Component extends React.Component {
      static getDerivedStateFromProps() {
        return null;
      }
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<Component />);
    assertConsoleErrorDev([
      '`Component` uses `getDerivedStateFromProps` but its initial state is ' +
        'undefined. This is not recommended. Instead, define the initial state by ' +
        'assigning an object to `this.state` in the constructor of `Component`. ' +
        'This ensures that `getDerivedStateFromProps` arguments have a consistent shape.\n' +
        '    in Component (at **)',
    ]);

    // De-duped
    ReactDOMServer.renderToString(<Component />);
  });

  it('should invoke both deprecated and new lifecycles if both are present', () => {
    const log = [];

    class Component extends React.Component {
      componentWillMount() {
        log.push('componentWillMount');
      }
      UNSAFE_componentWillMount() {
        log.push('UNSAFE_componentWillMount');
      }
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<Component />);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n' +
        '\n' +
        '* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.\n' +
        '\n' +
        'Please update the following components: Component\n' +
        '    in Component (at **)',
    ]);
    expect(log).toEqual(['componentWillMount', 'UNSAFE_componentWillMount']);
  });

  it('tracks state updates across components', () => {
    class Outer extends React.Component {
      UNSAFE_componentWillMount() {
        this.setState({x: 1});
      }
      render() {
        return <Inner updateParent={this.updateParent}>{this.state.x}</Inner>;
      }
      updateParent = () => {
        this.setState({x: 3});
      };
    }
    class Inner extends React.Component {
      UNSAFE_componentWillMount() {
        this.setState({x: 2});
        this.props.updateParent();
      }
      render() {
        return <div>{this.props.children + '-' + this.state.x}</div>;
      }
    }
    // Shouldn't be 1-3.
    expect(ReactDOMServer.renderToStaticMarkup(<Outer />)).toBe(
      '<div>1-2</div>',
    );
    assertConsoleErrorDev([
      'Can only update a mounting component. This ' +
        'usually means you called setState() outside componentWillMount() on ' +
        'the server. This is a no-op.\n\n' +
        'Please check the code for the Outer component.\n' +
        '    in Outer (at **)',
    ]);
  });

  it('should not invoke cWM if static gDSFP is present', () => {
    class Component extends React.Component {
      state = {};
      static getDerivedStateFromProps() {
        return null;
      }
      componentWillMount() {
        throw Error('unexpected');
      }
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<Component />);
    assertConsoleErrorDev([
      'Unsafe legacy lifecycles will not be called for components using new component APIs.\n' +
        '\n' +
        'Component uses getDerivedStateFromProps() but also contains the following legacy lifecycles:\n' +
        '  componentWillMount\n' +
        '\n' +
        'The above lifecycles should be removed. Learn more about this warning here:\n' +
        'https://react.dev/link/unsafe-component-lifecycles\n' +
        '    in Component (at **)',
    ]);
  });

  it('should warn about deprecated lifecycle hooks', () => {
    class MyComponent extends React.Component {
      componentWillMount() {}
      render() {
        return null;
      }
    }

    ReactDOMServer.renderToString(<MyComponent />);
    assertConsoleWarnDev([
      'componentWillMount has been renamed, and is not recommended for use. ' +
        'See https://react.dev/link/unsafe-component-lifecycles for details.\n' +
        '\n' +
        '* Move code from componentWillMount to componentDidMount (preferred in most cases) or the constructor.\n' +
        '\n' +
        'Please update the following components: MyComponent\n' +
        '    in MyComponent (at **)',
    ]);

    // De-duped
    ReactDOMServer.renderToString(<MyComponent />);
  });

  describe('react-lifecycles-compat', () => {
    const {polyfill} = require('react-lifecycles-compat');

    it('should not warn for components with polyfilled getDerivedStateFromProps', () => {
      class PolyfilledComponent extends React.Component {
        state = {};
        static getDerivedStateFromProps() {
          return null;
        }
        render() {
          return null;
        }
      }

      polyfill(PolyfilledComponent);

      const container = document.createElement('div');
      ReactDOMServer.renderToString(
        <React.StrictMode>
          <PolyfilledComponent />
        </React.StrictMode>,
        container,
      );
    });

    it('should not warn for components with polyfilled getSnapshotBeforeUpdate', () => {
      class PolyfilledComponent extends React.Component {
        getSnapshotBeforeUpdate() {
          return null;
        }
        componentDidUpdate() {}
        render() {
          return null;
        }
      }

      polyfill(PolyfilledComponent);

      const container = document.createElement('div');
      ReactDOMServer.renderToString(
        <React.StrictMode>
          <PolyfilledComponent />
        </React.StrictMode>,
        container,
      );
    });
  });
});
