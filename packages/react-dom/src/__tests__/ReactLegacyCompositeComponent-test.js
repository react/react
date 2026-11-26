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
let findDOMNode;
let ReactDOMClient;
let PropTypes;

let act;
let assertConsoleErrorDev;

describe('ReactLegacyCompositeComponent', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    findDOMNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
        .findDOMNode;
    PropTypes = require('prop-types');
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  // @gate !disableLegacyContext
  it('should pass context to children when not owner', async () => {
    class Parent extends React.Component {
      render() {
        return (
          <Child>
            <Grandchild />
          </Child>
        );
      }
    }

    class Child extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
      };

      getChildContext() {
        return {
          foo: 'bar',
        };
      }

      render() {
        return React.Children.only(this.props.children);
      }
    }

    class Grandchild extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
      };

      render() {
        return <div>{this.context.foo}</div>;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let component;
    await act(() => {
      root.render(<Parent ref={current => (component = current)} />);
    });
    assertConsoleErrorDev([
      'Child uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Grandchild uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
    ]);
    expect(findDOMNode(component).innerHTML).toBe('bar');
  });

  // @gate !disableLegacyContext
  it('should pass context when re-rendered for static child', async () => {
    let parentInstance = null;
    let childInstance = null;

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
        flag: PropTypes.bool,
      };

      state = {
        flag: false,
      };

      getChildContext() {
        return {
          foo: 'bar',
          flag: this.state.flag,
        };
      }

      render() {
        return React.Children.only(this.props.children);
      }
    }

    class Middle extends React.Component {
      render() {
        return this.props.children;
      }
    }

    class Child extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
        flag: PropTypes.bool,
      };

      render() {
        childInstance = this;
        return <span>Child</span>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <Parent ref={current => (parentInstance = current)}>
          <Middle>
            <Child />
          </Middle>
        </Parent>,
      );
    });

    expect(parentInstance.state.flag).toBe(false);
    expect(childInstance.context).toEqual({foo: 'bar', flag: false});

    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)',
    ]);

    await act(() => {
      parentInstance.setState({flag: true});
    });
    expect(parentInstance.state.flag).toBe(true);
    expect(childInstance.context).toEqual({foo: 'bar', flag: true});
  });

  // @gate !disableLegacyContext
  it('should pass context when re-rendered for static child within a composite component', async () => {
    class Parent extends React.Component {
      static childContextTypes = {
        flag: PropTypes.bool,
      };

      state = {
        flag: true,
      };

      getChildContext() {
        return {
          flag: this.state.flag,
        };
      }

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    class Child extends React.Component {
      static contextTypes = {
        flag: PropTypes.bool,
      };

      render() {
        return <div />;
      }
    }

    class Wrapper extends React.Component {
      parentRef = React.createRef();
      childRef = React.createRef();

      render() {
        return (
          <Parent ref={this.parentRef}>
            <Child ref={this.childRef} />
          </Parent>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let wrapper;
    await act(() => {
      root.render(<Wrapper ref={current => (wrapper = current)} />);
    });

    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Wrapper (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Wrapper (at **)',
    ]);

    expect(wrapper.parentRef.current.state.flag).toEqual(true);
    expect(wrapper.childRef.current.context).toEqual({flag: true});

    // We update <Parent /> while <Child /> is still a static prop relative to this update
    await act(() => {
      wrapper.parentRef.current.setState({flag: false});
    });

    expect(wrapper.parentRef.current.state.flag).toEqual(false);
    expect(wrapper.childRef.current.context).toEqual({flag: false});
  });

  // @gate !disableLegacyContext
  it('should pass context transitively', async () => {
    let childInstance = null;
    let grandchildInstance = null;

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
        depth: PropTypes.number,
      };

      getChildContext() {
        return {
          foo: 'bar',
          depth: 0,
        };
      }

      render() {
        return <Child />;
      }
    }

    class Child extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
        depth: PropTypes.number,
      };

      static childContextTypes = {
        depth: PropTypes.number,
      };

      getChildContext() {
        return {
          depth: this.context.depth + 1,
        };
      }

      render() {
        childInstance = this;
        return <Grandchild />;
      }
    }

    class Grandchild extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
        depth: PropTypes.number,
      };

      render() {
        grandchildInstance = this;
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Child uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
      'Grandchild uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Child (at **)\n' +
        '    in Parent (at **)',
    ]);

    expect(childInstance.context).toEqual({foo: 'bar', depth: 0});
    expect(grandchildInstance.context).toEqual({foo: 'bar', depth: 1});
  });

  // @gate !disableLegacyContext
  it('should pass context when re-rendered', async () => {
    let parentInstance = null;
    let childInstance = null;

    class Parent extends React.Component {
      static childContextTypes = {
        foo: PropTypes.string,
        depth: PropTypes.number,
      };

      state = {
        flag: false,
      };

      getChildContext() {
        return {
          foo: 'bar',
          depth: 0,
        };
      }

      render() {
        let output = <Child />;
        if (!this.state.flag) {
          output = <span>Child</span>;
        }
        return output;
      }
    }

    class Child extends React.Component {
      static contextTypes = {
        foo: PropTypes.string,
        depth: PropTypes.number,
      };

      render() {
        childInstance = this;
        return <span>Child</span>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent ref={current => (parentInstance = current)} />);
    });
    assertConsoleErrorDev([
      'Parent uses the legacy childContextTypes API which will soon be removed. ' +
        'Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
    ]);

    expect(childInstance).toBeNull();

    expect(parentInstance.state.flag).toBe(false);
    await act(() => {
      parentInstance.setState({flag: true});
    });
    assertConsoleErrorDev([
      'Child uses the legacy contextTypes API which will soon be removed. ' +
        'Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
        '    in Parent (at **)',
    ]);

    expect(parentInstance.state.flag).toBe(true);

    expect(childInstance.context).toEqual({foo: 'bar', depth: 0});
  });

  it('should replace state in legacy mode', async () => {
    class Moo extends React.Component {
      state = {x: 1};
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let moo;
    await act(() => {
      root.render(<Moo ref={current => (moo = current)} />);
    });

    // No longer a public API, but we can test that it works internally by
    // reaching into the updater.
    await act(() => {
      moo.updater.enqueueReplaceState(moo, {y: 2});
    });
    expect('x' in moo.state).toBe(false);
    expect(moo.state.y).toBe(2);
  });

  it('should support objects with prototypes as state in legacy mode', async () => {
    const NotActuallyImmutable = function (str) {
      this.str = str;
    };
    NotActuallyImmutable.prototype.amIImmutable = function () {
      return true;
    };
    class Moo extends React.Component {
      state = new NotActuallyImmutable('first');
      // No longer a public API, but we can test that it works internally by
      // reaching into the updater.
      _replaceState = update => this.updater.enqueueReplaceState(this, update);
      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let moo;
    await act(() => {
      root.render(<Moo ref={current => (moo = current)} />);
    });

    expect(moo.state.str).toBe('first');
    expect(moo.state.amIImmutable()).toBe(true);

    const secondState = new NotActuallyImmutable('second');
    await act(() => {
      moo._replaceState(secondState);
    });
    expect(moo.state.str).toBe('second');
    expect(moo.state.amIImmutable()).toBe(true);
    expect(moo.state).toBe(secondState);

    await act(() => {
      moo.setState({str: 'third'});
    });
    expect(moo.state.str).toBe('third');
    // Here we lose the prototype.
    expect(moo.state.amIImmutable).toBe(undefined);

    // When more than one state update is enqueued, we have the same behavior
    const fifthState = new NotActuallyImmutable('fifth');
    await act(() => {
      moo.setState({str: 'fourth'});
      moo._replaceState(fifthState);
    });
    expect(moo.state).toBe(fifthState);

    // When more than one state update is enqueued, we have the same behavior
    const sixthState = new NotActuallyImmutable('sixth');
    await act(() => {
      moo._replaceState(sixthState);
      moo.setState({str: 'seventh'});
    });
    expect(moo.state.str).toBe('seventh');
    expect(moo.state.amIImmutable).toBe(undefined);
  });
});
