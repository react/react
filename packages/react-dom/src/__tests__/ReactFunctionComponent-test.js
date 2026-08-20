/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let PropTypes;
let React;
let ReactDOMClient;
let act;
let assertConsoleErrorDev;

function FunctionComponent(props) {
  return <div>{props.name}</div>;
}

describe('ReactFunctionComponent', () => {
  beforeEach(() => {
    jest.resetModules();
    PropTypes = require('prop-types');
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  it('should render stateless component', async () => {
    const el = document.createElement('div');

    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<FunctionComponent name="A" />);
    });

    expect(el.textContent).toBe('A');
  });

  it('should update stateless component', async () => {
    class Parent extends React.Component {
      render() {
        return <FunctionComponent {...this.props} />;
      }
    }

    const el = document.createElement('div');

    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<Parent name="A" />);
    });
    expect(el.textContent).toBe('A');

    await act(() => {
      root.render(<Parent name="B" />);
    });
    expect(el.textContent).toBe('B');
  });

  it('should unmount stateless component', async () => {
    const container = document.createElement('div');

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponent name="A" />);
    });
    expect(container.textContent).toBe('A');

    root.unmount();
    expect(container.textContent).toBe('');
  });

  // @gate !disableLegacyContext
  it('should pass context thru stateless component', async () => {
    class Child extends React.Component {
      static contextTypes = {
        test: PropTypes.string.isRequired,
      };

      render() {
        return <div>{this.context.test}</div>;
      }
    }

    function Parent() {
      return <Child />;
    }

    class GrandParent extends React.Component {
      static childContextTypes = {
        test: PropTypes.string.isRequired,
      };

      getChildContext() {
        return {test: this.props.test};
      }

      render() {
        return <Parent />;
      }
    }

    const el = document.createElement('div');

    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<GrandParent test="test" />);
    });

    assertConsoleErrorDev([
      'GrandParent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in GrandParent (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)\n' +
        '    in GrandParent (at **)',
    ]);

    expect(el.textContent).toBe('test');

    await act(() => {
      root.render(<GrandParent test="mest" />);
    });

    expect(el.textContent).toBe('mest');
  });

  it('should warn for getDerivedStateFromProps on a function component', async () => {
    function FunctionComponentWithChildContext() {
      return null;
    }
    FunctionComponentWithChildContext.getDerivedStateFromProps = function () {};

    const container = document.createElement('div');

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponentWithChildContext />);
    });
    assertConsoleErrorDev([
      'FunctionComponentWithChildContext: Function ' +
        'components do not support getDerivedStateFromProps.\n' +
        '    in FunctionComponentWithChildContext (at **)',
    ]);
  });

  it('should warn for childContextTypes on a function component', async () => {
    function FunctionComponentWithChildContext(props) {
      return <div>{props.name}</div>;
    }

    FunctionComponentWithChildContext.childContextTypes = {
      foo: PropTypes.string,
    };

    const container = document.createElement('div');

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<FunctionComponentWithChildContext name="A" />);
    });
    assertConsoleErrorDev([
      'childContextTypes cannot ' +
        'be defined on a function component.\n' +
        '  FunctionComponentWithChildContext.childContextTypes = ...\n' +
        '    in FunctionComponentWithChildContext (at **)',
    ]);
  });

  it('should not throw when stateless component returns undefined', async () => {
    function NotAComponent() {}
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(
          <div>
            <NotAComponent />
          </div>,
        );
      }),
    ).resolves.not.toThrowError();
  });

  it('should use correct name in key warning', async () => {
    function Child() {
      return <div>{[<span />]}</div>;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Child />);
    });
    assertConsoleErrorDev([
      'Each child in a list should have a unique "key" prop.\n' +
        '\n' +
        'Check the render method of `Child`. See https://react.dev/link/warning-keys for more information.\n' +
        '    in span (at **)\n' +
        '    in Child (at **)',
    ]);
  });

  // @gate !disableLegacyContext && !disableLegacyContextForFunctionComponents
  it('should receive context', async () => {
    class Parent extends React.Component {
      static childContextTypes = {
        lang: PropTypes.string,
      };

      getChildContext() {
        return {lang: 'en'};
      }

      render() {
        return <Child />;
      }
    }

    function Child(props, context) {
      return <div>{context.lang}</div>;
    }
    Child.contextTypes = {lang: PropTypes.string};

    const el = document.createElement('div');

    const root = ReactDOMClient.createRoot(el);
    await act(() => {
      root.render(<Parent />);
    });
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Child uses the legacy contextTypes API which will be removed soon. ' +
        'Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
    ]);
    expect(el.textContent).toBe('en');
  });

  it('should work with arrow functions', async () => {
    let Child = function () {
      return <div />;
    };
    // Will create a new bound function without a prototype, much like a native
    // arrow function.
    Child = Child.bind(this);

    await expect(async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Child />);
      });
    }).not.toThrow();
  });

  it('should allow simple functions to return null', async () => {
    const Child = function () {
      return null;
    };
    await expect(async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Child />);
      });
    }).not.toThrow();
  });

  it('should allow simple functions to return false', async () => {
    function Child() {
      return false;
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(
      act(() => {
        root.render(<Child />);
      }),
    ).resolves.not.toThrow();
  });
});
