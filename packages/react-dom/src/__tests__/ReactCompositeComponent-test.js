/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let ChildUpdates;
let MorphingComponent;
let React;
let ReactDOM;
let ReactDOMClient;
let ReactSharedInternals;
let Scheduler;
let assertLog;
let act;
let assertConsoleErrorDev;

describe('ReactCompositeComponent', () => {
  const hasOwnProperty = Object.prototype.hasOwnProperty;

  /**
   * Performs equality by iterating through keys on an object and returning false
   * when any key has values which are not strictly equal between the arguments.
   * Returns true when the values of all keys are strictly equal.
   */
  function shallowEqual(objA: mixed, objB: mixed): boolean {
    if (Object.is(objA, objB)) {
      return true;
    }
    if (
      typeof objA !== 'object' ||
      objA === null ||
      typeof objB !== 'object' ||
      objB === null
    ) {
      return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (let i = 0; i < keysA.length; i++) {
      if (
        !hasOwnProperty.call(objB, keysA[i]) ||
        !Object.is(objA[keysA[i]], objB[keysA[i]])
      ) {
        return false;
      }
    }
    return true;
  }

  function shallowCompare(instance, nextProps, nextState) {
    return (
      !shallowEqual(instance.props, nextProps) ||
      !shallowEqual(instance.state, nextState)
    );
  }

  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    ReactSharedInternals =
      require('react').__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    Scheduler = require('scheduler');
    assertLog = require('internal-test-utils').assertLog;
    ({act, assertConsoleErrorDev} = require('internal-test-utils'));
  });

  describe('MorphingComponent', () => {
    let instance;
    let childInstance;

    beforeEach(() => {
      MorphingComponent = class extends React.Component {
        state = {activated: false};
        xRef = React.createRef();

        componentDidMount() {
          instance = this;
        }

        _toggleActivatedState = () => {
          this.setState({activated: !this.state.activated});
        };

        render() {
          const toggleActivatedState = this._toggleActivatedState;
          return !this.state.activated ? (
            <a ref={this.xRef} onClick={toggleActivatedState} />
          ) : (
            <b ref={this.xRef} onClick={toggleActivatedState} />
          );
        }
      };

      /**
       * We'll use this to ensure that an old version is not cached when it is
       * reallocated again.
       */
      ChildUpdates = class extends React.Component {
        anchorRef = React.createRef();

        componentDidMount() {
          childInstance = this;
        }

        getAnchor = () => {
          return this.anchorRef.current;
        };

        render() {
          const className = this.props.anchorClassOn ? 'anchorClass' : '';
          return this.props.renderAnchor ? (
            <a ref={this.anchorRef} className={className} />
          ) : (
            <b />
          );
        }
      };
    });
    it('should support rendering to different child types over time', async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => {
        root.render(<MorphingComponent />);
      });
      expect(instance.xRef.current.tagName).toBe('A');

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe('B');

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe('A');
    });

    it('should react to state changes from callbacks', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = ReactDOMClient.createRoot(container);
      try {
        await act(() => {
          root.render(<MorphingComponent />);
        });
        expect(instance.xRef.current.tagName).toBe('A');
        await act(() => {
          instance.xRef.current.click();
        });
        expect(instance.xRef.current.tagName).toBe('B');
      } finally {
        document.body.removeChild(container);
        root.unmount();
      }
    });

    it('should rewire refs when rendering to different child types', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<MorphingComponent />);
      });
      expect(instance.xRef.current.tagName).toBe('A');

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe('B');

      await act(() => {
        instance._toggleActivatedState();
      });
      expect(instance.xRef.current.tagName).toBe('A');
    });

    it('should not cache old DOM nodes when switching constructors', async () => {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<ChildUpdates renderAnchor={true} anchorClassOn={false} />);
      });
      await act(() => {
        root.render(
          // Warm any cache
          <ChildUpdates renderAnchor={true} anchorClassOn={true} />,
        );
      });
      await act(() => {
        root.render(
          // Clear out the anchor
          <ChildUpdates renderAnchor={false} anchorClassOn={true} />,
        );
      });
      await act(() => {
        root.render(
          // rerender
          <ChildUpdates renderAnchor={true} anchorClassOn={false} />,
        );
      });
      expect(childInstance.getAnchor().className).toBe('');
    });
  });

  it('should not support module pattern components', async () => {
    function Child({test}) {
      return {
        render() {
          return <div>{test}</div>;
        },
      };
    }

    const el = document.createElement('div');
    const root = ReactDOMClient.createRoot(el);
    await expect(async () => {
      await act(() => {
        root.render(<Child test="test" />);
      });
    }).rejects.toThrow(
      'Objects are not valid as a React child (found: object with keys {render}).',
    );

    expect(el.textContent).toBe('');
  });

  it('should use default values for undefined props', async () => {
    class Component extends React.Component {
      static defaultProps = {prop: 'testKey'};

      render() {
        return <span />;
      }
    }

    function refFn1(ref) {
      instance1 = ref;
    }

    function refFn2(ref) {
      instance2 = ref;
    }

    function refFn3(ref) {
      instance3 = ref;
    }

    let instance1;
    let instance2;
    let instance3;
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component ref={refFn1} />);
    });
    expect(instance1.props).toEqual({prop: 'testKey'});

    await act(() => {
      root.render(<Component ref={refFn2} prop={undefined} />);
    });
    expect(instance2.props).toEqual({prop: 'testKey'});

    await act(() => {
      root.render(<Component ref={refFn3} prop={null} />);
    });
    expect(instance3.props).toEqual({prop: null});
  });

  it('should not mutate passed-in props object', async () => {
    class Component extends React.Component {
      static defaultProps = {prop: 'testKey'};

      render() {
        return <span />;
      }
    }

    const inputProps = {};
    let instance1;
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component {...inputProps} ref={ref => (instance1 = ref)} />);
    });
    expect(instance1.props.prop).toBe('testKey');

    // We don't mutate the input, just in case the caller wants to do something
    // with it after using it to instantiate a component
    expect(inputProps.prop).not.toBeDefined();
  });

  it('should warn about `forceUpdate` on not-yet-mounted components', async () => {
    class MyComponent extends React.Component {
      constructor(props) {
        super(props);
        this.forceUpdate();
      }
      render() {
        return <div>foo</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<MyComponent />);
    });
    assertConsoleErrorDev([
      "Can't call forceUpdate on a component that is not yet mounted. " +
        'This is a no-op, but it might indicate a bug in your application. ' +
        'Instead, assign to `this.state` directly or define a `state = {};` ' +
        'class property with the desired state in the MyComponent component.\n' +
        '    in MyComponent (at **)',
    ]);

    // No additional warning should be recorded
    const container2 = document.createElement('div');
    const root2 = ReactDOMClient.createRoot(container2);
    await act(() => {
      root2.render(<MyComponent />);
    });
    expect(container2.firstChild.textContent).toBe('foo');
  });

  it('should warn about `setState` on not-yet-mounted components', async () => {
    class MyComponent extends React.Component {
      constructor(props) {
        super(props);
        this.setState();
      }
      render() {
        return <div>foo</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    ReactDOM.flushSync(() => {
      root.render(<MyComponent />);
    });
    assertConsoleErrorDev([
      "Can't call setState on a component that is not yet mounted. " +
        'This is a no-op, but it might indicate a bug in your application. ' +
        'Instead, assign to `this.state` directly or define a `state = {};` ' +
        'class property with the desired state in the MyComponent component.\n' +
        '    in MyComponent (at **)',
    ]);

    // No additional warning should be recorded
    const container2 = document.createElement('div');
    const root2 = ReactDOMClient.createRoot(container2);
    await act(() => {
      root2.render(<MyComponent />);
    });
    expect(container2.firstChild.textContent).toBe('foo');
  });

  it('should not warn about `forceUpdate` on unmounted components', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let instance;
    class Component extends React.Component {
      componentDidMount() {
        instance = this;
      }

      render() {
        return <div />;
      }
    }

    const component = <Component />;
    expect(component.forceUpdate).not.toBeDefined();
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(component);
    });

    instance.forceUpdate();

    root.unmount(container);

    instance.forceUpdate();
    instance.forceUpdate();
  });

  it('should not warn about `setState` on unmounted components', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    class Component extends React.Component {
      state = {value: 0};

      render() {
        Scheduler.log('render ' + this.state.value);
        return <div />;
      }
    }

    let ref;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <div>
          <span>
            <Component ref={c => (ref = c || ref)} />
          </span>
        </div>,
      );
    });

    assertLog(['render 0']);

    await act(() => {
      ref.setState({value: 1});
    });
    assertLog(['render 1']);

    await act(() => {
      root.render(<div />);
    });

    await act(() => {
      ref.setState({value: 2});
    });
    // setState on an unmounted component is a noop.
    assertLog([]);
  });

  it('should silently allow `setState`, not call cb on unmounting components', async () => {
    let cbCalled = false;
    const container = document.createElement('div');
    document.body.appendChild(container);

    class Component extends React.Component {
      state = {value: 0};

      componentWillUnmount() {
        expect(() => {
          this.setState({value: 2}, function () {
            cbCalled = true;
          });
        }).not.toThrow();
      }

      render() {
        return <div />;
      }
    }
    let instance;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component ref={c => (instance = c)} />);
    });
    await act(() => {
      instance.setState({value: 1});
    });
    instance.setState({value: 1});

    root.unmount();
    expect(cbCalled).toBe(false);
  });

  it('should warn when rendering a class with a render method that does not extend React.Component', async () => {
    const container = document.createElement('div');
    class ClassWithRenderNotExtended {
      render() {
        return <div />;
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<ClassWithRenderNotExtended />);
      });
    }).rejects.toThrow(TypeError);
    assertConsoleErrorDev([
      'The <ClassWithRenderNotExtended /> component appears to have a render method, ' +
        "but doesn't extend React.Component. This is likely to cause errors. " +
        'Change ClassWithRenderNotExtended to extend React.Component instead.\n' +
        '    in ClassWithRenderNotExtended (at **)',
    ]);

    // Test deduplication
    await expect(async () => {
      await act(() => {
        root.render(<ClassWithRenderNotExtended />);
      });
    }).rejects.toThrow(TypeError);
  });

  it('should warn about `setState` in render', async () => {
    const container = document.createElement('div');

    class Component extends React.Component {
      state = {value: 0};

      render() {
        Scheduler.log('render ' + this.state.value);
        if (this.state.value === 0) {
          this.setState({value: 1});
        }
        return <div>foo {this.state.value}</div>;
      }
    }

    let instance;
    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<Component ref={ref => (instance = ref)} />);
    });
    assertConsoleErrorDev([
      'Cannot update during an existing state transition (such as within ' +
        '`render`). Render methods should be a pure function of props and state.\n' +
        '    in Component (at **)',
    ]);

    // The setState call is queued and then executed as a second pass. This
    // behavior is undefined though so we're free to change it to suit the
    // implementation details.
    assertLog(['render 0', 'render 1']);
    expect(instance.state.value).toBe(1);

    // Forcing a rerender anywhere will cause the update to happen.
    await act(() => {
      root.render(<Component prop={123} />);
    });
    assertLog(['render 1']);
  });

  it('should cleanup even if render() fatals', async () => {
    const ownerEnabled = __DEV__;

    let stashedDispatcher;
    class BadComponent extends React.Component {
      render() {
        // Stash the dispatcher that was available in render so we can check
        // that its internals also reset.
        stashedDispatcher = ReactSharedInternals.A;
        throw new Error();
      }
    }

    const instance = <BadComponent />;
    expect(ReactSharedInternals.A).toBe(null);

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await expect(async () => {
      await act(() => {
        root.render(instance);
      });
    }).rejects.toThrow();

    expect(ReactSharedInternals.A).toBe(null);
    if (ownerEnabled) {
      expect(stashedDispatcher.getOwner()).toBe(null);
    } else {
      expect(stashedDispatcher.getOwner).toBe(undefined);
    }
  });

  it('should call componentWillUnmount before unmounting', async () => {
    const container = document.createElement('div');
    let innerUnmounted = false;

    class Component extends React.Component {
      render() {
        return (
          <div>
            <Inner />
            Text
          </div>
        );
      }
    }

    class Inner extends React.Component {
      componentWillUnmount() {
        innerUnmounted = true;
      }

      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });
    root.unmount();
    expect(innerUnmounted).toBe(true);
  });

  it('should warn when shouldComponentUpdate() returns undefined', async () => {
    class ClassComponent extends React.Component {
      state = {bogus: false};

      shouldComponentUpdate() {
        return undefined;
      }

      render() {
        return <div />;
      }
    }
    let instance;
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<ClassComponent ref={ref => (instance = ref)} />);
    });

    ReactDOM.flushSync(() => {
      instance.setState({bogus: true});
    });
    assertConsoleErrorDev([
      'ClassComponent.shouldComponentUpdate(): Returned undefined instead of a ' +
        'boolean value. Make sure to return true or false.\n' +
        '    in ClassComponent (at **)',
    ]);
  });

  it('should warn when componentDidUnmount method is defined', async () => {
    class Component extends React.Component {
      componentDidUnmount = () => {};

      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    ReactDOM.flushSync(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      'Component has a method called ' +
        'componentDidUnmount(). But there is no such lifecycle method. ' +
        'Did you mean componentWillUnmount()?\n' +
        '    in Component (at **)',
    ]);
  });

  it('should warn when componentDidReceiveProps method is defined', () => {
    class Component extends React.Component {
      componentDidReceiveProps = () => {};

      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));

    ReactDOM.flushSync(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      'Component has a method called ' +
        'componentDidReceiveProps(). But there is no such lifecycle method. ' +
        'If you meant to update the state in response to changing props, ' +
        'use componentWillReceiveProps(). If you meant to fetch data or ' +
        'run side-effects or mutations after React has updated the UI, use componentDidUpdate().\n' +
        '    in Component (at **)',
    ]);
  });

  it('should warn when defaultProps was defined as an instance property', () => {
    class Component extends React.Component {
      constructor(props) {
        super(props);
        this.defaultProps = {name: 'Abhay'};
      }

      render() {
        return <div />;
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));

    ReactDOM.flushSync(() => {
      root.render(<Component />);
    });
    assertConsoleErrorDev([
      'Setting defaultProps as an instance property on Component is not supported ' +
        'and will be ignored. Instead, define defaultProps as a static property on Component.\n' +
        '    in Component (at **)',
    ]);
  });

  it('should skip update when rerendering element in container', async () => {
    class Parent extends React.Component {
      render() {
        return <div>{this.props.children}</div>;
      }
    }

    class Child extends React.Component {
      render() {
        Scheduler.log('Child render');
        return <div />;
      }
    }

    const container = document.createElement('div');
    const child = <Child />;
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent>{child}</Parent>);
    });
    assertLog(['Child render']);

    await act(() => {
      root.render(<Parent>{child}</Parent>);
    });
    assertLog([]);
  });

  it('should disallow nested render calls', () => {
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    class Inner extends React.Component {
      render() {
        return <div />;
      }
    }

    class Outer extends React.Component {
      render() {
        root.render(<Inner />);
        return <div />;
      }
    }

    ReactDOM.flushSync(() => {
      root.render(<Outer />);
    });
    assertConsoleErrorDev([
      'Render methods should be a pure function of props and state; ' +
        'triggering nested component updates from render is not allowed. If ' +
        'necessary, trigger nested updates in componentDidUpdate.\n\n' +
        'Check the render method of Outer.\n' +
        '    in Outer (at **)',
    ]);
  });

  it('only renders once if updated in componentWillReceiveProps', async () => {
    let renders = 0;

    class Component extends React.Component {
      state = {updated: false};

      UNSAFE_componentWillReceiveProps(props) {
        expect(props.update).toBe(1);
        expect(renders).toBe(1);
        this.setState({updated: true});
        expect(renders).toBe(1);
      }

      render() {
        renders++;
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;

    await act(() => {
      root.render(<Component update={0} ref={ref => (instance = ref)} />);
    });
    expect(renders).toBe(1);
    expect(instance.state.updated).toBe(false);

    await act(() => {
      root.render(<Component update={1} ref={ref => (instance = ref)} />);
    });
    expect(renders).toBe(2);
    expect(instance.state.updated).toBe(true);
  });

  it('only renders once if updated in componentWillReceiveProps when batching', async () => {
    let renders = 0;

    class Component extends React.Component {
      state = {updated: false};

      UNSAFE_componentWillReceiveProps(props) {
        expect(props.update).toBe(1);
        expect(renders).toBe(1);
        this.setState({updated: true});
        expect(renders).toBe(1);
      }

      render() {
        renders++;
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component update={0} ref={ref => (instance = ref)} />);
    });
    expect(renders).toBe(1);
    expect(instance.state.updated).toBe(false);
    await act(() => {
      root.render(<Component update={1} ref={ref => (instance = ref)} />);
    });
    expect(renders).toBe(2);
    expect(instance.state.updated).toBe(true);
  });

  it('should warn when mutated props are passed', async () => {
    const container = document.createElement('div');

    class Foo extends React.Component {
      constructor(props) {
        const _props = {idx: props.idx + '!'};
        super(_props);
      }

      render() {
        return <span />;
      }
    }

    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<Foo idx="qwe" />);
    });
    assertConsoleErrorDev([
      'When calling super() in `Foo`, make sure to pass ' +
        "up the same props that your component's constructor was passed.\n" +
        '    in Foo (at **)',
    ]);
  });

  it('should only call componentWillUnmount once', async () => {
    let app;
    let count = 0;

    class App extends React.Component {
      render() {
        if (this.props.stage === 1) {
          return <UnunmountableComponent />;
        } else {
          return null;
        }
      }
    }

    class UnunmountableComponent extends React.Component {
      componentWillUnmount() {
        app.setState({});
        count++;
        throw Error('always fails');
      }

      render() {
        return <div>Hello {this.props.name}</div>;
      }
    }

    const container = document.createElement('div');

    const setRef = ref => {
      if (ref) {
        app = ref;
      }
    };

    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<App ref={setRef} stage={1} />);
      });
      await act(() => {
        root.render(<App ref={setRef} stage={2} />);
      });
    }).rejects.toThrow();
    expect(count).toBe(1);
  });

  it('prepares new child before unmounting old', async () => {
    class Spy extends React.Component {
      UNSAFE_componentWillMount() {
        Scheduler.log(this.props.name + ' componentWillMount');
      }
      render() {
        Scheduler.log(this.props.name + ' render');
        return <div />;
      }
      componentDidMount() {
        Scheduler.log(this.props.name + ' componentDidMount');
      }
      componentWillUnmount() {
        Scheduler.log(this.props.name + ' componentWillUnmount');
      }
    }

    class Wrapper extends React.Component {
      render() {
        return <Spy key={this.props.name} name={this.props.name} />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Wrapper name="A" />);
    });

    assertLog(['A componentWillMount', 'A render', 'A componentDidMount']);
    await act(() => {
      root.render(<Wrapper name="B" />);
    });

    assertLog([
      'B componentWillMount',
      'B render',
      'A componentWillUnmount',
      'B componentDidMount',
    ]);
  });

  it('respects a shallow shouldComponentUpdate implementation', async () => {
    class PlasticWrap extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          color: 'green',
        };
        this.appleRef = React.createRef();
      }

      render() {
        return <Apple color={this.state.color} ref={this.appleRef} />;
      }
    }

    class Apple extends React.Component {
      state = {
        cut: false,
        slices: 1,
      };

      shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
      }

      cut() {
        this.setState({
          cut: true,
          slices: 10,
        });
      }

      eatSlice() {
        this.setState({
          slices: this.state.slices - 1,
        });
      }

      render() {
        const {color} = this.props;
        const {cut, slices} = this.state;

        Scheduler.log(`${color} ${cut} ${slices}`);
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<PlasticWrap ref={ref => (instance = ref)} />);
    });
    assertLog(['green false 1']);

    // Do not re-render based on props
    await act(() => {
      instance.setState({color: 'green'});
    });
    assertLog([]);

    // Re-render based on props
    await act(() => {
      instance.setState({color: 'red'});
    });
    assertLog(['red false 1']);

    // Re-render base on state
    await act(() => {
      instance.appleRef.current.cut();
    });
    assertLog(['red true 10']);

    // No re-render based on state
    await act(() => {
      instance.appleRef.current.cut();
    });
    assertLog([]);

    // Re-render based on state again
    await act(() => {
      instance.appleRef.current.eatSlice();
    });
    assertLog(['red true 9']);
  });

  it('does not do a deep comparison for a shallow shouldComponentUpdate implementation', async () => {
    function getInitialState() {
      return {
        foo: [1, 2, 3],
        bar: {a: 4, b: 5, c: 6},
      };
    }

    const initialSettings = getInitialState();

    class Component extends React.Component {
      state = initialSettings;

      shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
      }

      render() {
        const {foo, bar} = this.state;
        Scheduler.log(`{foo:[${foo}],bar:{a:${bar.a},b:${bar.b},c:${bar.c}}`);
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    let instance;
    await act(() => {
      root.render(<Component ref={ref => (instance = ref)} />);
    });
    assertLog(['{foo:[1,2,3],bar:{a:4,b:5,c:6}']);

    // Do not re-render if state is equal
    const settings = {
      foo: initialSettings.foo,
      bar: initialSettings.bar,
    };
    await act(() => {
      instance.setState(settings);
    });
    assertLog([]);

    // Re-render because one field changed
    initialSettings.foo = [1, 2, 3];
    await act(() => {
      instance.setState(initialSettings);
    });
    assertLog(['{foo:[1,2,3],bar:{a:4,b:5,c:6}']);

    // Re-render because the object changed
    await act(() => {
      instance.setState(getInitialState());
    });
    assertLog(['{foo:[1,2,3],bar:{a:4,b:5,c:6}']);
  });

  it('should call setState callback with no arguments', async () => {
    let mockArgs;
    class Component extends React.Component {
      componentDidMount() {
        this.setState({}, (...args) => (mockArgs = args));
      }
      render() {
        return false;
      }
    }
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Component />);
    });

    expect(mockArgs.length).toEqual(0);
  });

  it('this.state should be updated on setState callback inside componentWillMount', async () => {
    const div = document.createElement('div');
    let stateSuccessfullyUpdated = false;

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      UNSAFE_componentWillMount() {
        this.setState(
          {hasUpdatedState: true},
          () => (stateSuccessfullyUpdated = this.state.hasUpdatedState),
        );
      }

      render() {
        return <div>{this.props.children}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(div);
    await act(() => {
      root.render(<Component />);
    });

    expect(stateSuccessfullyUpdated).toBe(true);
  });

  it('should call the setState callback even if shouldComponentUpdate = false', async () => {
    const mockFn = jest.fn().mockReturnValue(false);
    const div = document.createElement('div');

    class Component extends React.Component {
      constructor(props, context) {
        super(props, context);
        this.state = {
          hasUpdatedState: false,
        };
      }

      UNSAFE_componentWillMount() {
        instance = this;
      }

      shouldComponentUpdate() {
        return mockFn();
      }

      render() {
        return <div>{this.state.hasUpdatedState}</div>;
      }
    }

    const root = ReactDOMClient.createRoot(div);
    let instance;
    await act(() => {
      root.render(<Component ref={ref => (instance = ref)} />);
    });

    expect(instance).toBeDefined();
    expect(mockFn).not.toBeCalled();

    await act(() => {
      instance.setState({hasUpdatedState: true}, () => {
        expect(mockFn).toBeCalled();
        expect(instance.state.hasUpdatedState).toBe(true);
        Scheduler.log('setState callback called');
      });
    });

    assertLog(['setState callback called']);
  });

  it('should return a meaningful warning when constructor is returned', async () => {
    class RenderTextInvalidConstructor extends React.Component {
      constructor(props) {
        super(props);
        return {something: false};
      }

      render() {
        return <div />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await expect(async () => {
      await act(() => {
        root.render(<RenderTextInvalidConstructor />);
      });
    }).rejects.toThrow();
    assertConsoleErrorDev([
      'No `render` method found on the RenderTextInvalidConstructor instance: ' +
        'did you accidentally return an object from the constructor?\n' +
        '    in RenderTextInvalidConstructor (at **)',
      'No `render` method found on the RenderTextInvalidConstructor instance: ' +
        'did you accidentally return an object from the constructor?\n' +
        '    in RenderTextInvalidConstructor (at **)',
    ]);
  });

  it('should warn about reassigning this.props while rendering', () => {
    class Bad extends React.Component {
      componentDidMount() {}
      componentDidUpdate() {}
      render() {
        this.props = {...this.props};
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<Bad />);
    });
    assertConsoleErrorDev([
      'It looks like Bad is reassigning its own `this.props` while rendering. ' +
        'This is not supported and can lead to confusing bugs.\n' +
        '    in Bad (at **)',
    ]);
  });

  it('should return error if render is not defined', async () => {
    class RenderTestUndefinedRender extends React.Component {}

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await expect(async () => {
      await act(() => {
        root.render(<RenderTestUndefinedRender />);
      });
    }).rejects.toThrow();
    assertConsoleErrorDev([
      'No `render` method found on the RenderTestUndefinedRender instance: ' +
        'you may have forgotten to define `render`.\n' +
        '    in RenderTestUndefinedRender (at **)',
      'No `render` method found on the RenderTestUndefinedRender instance: ' +
        'you may have forgotten to define `render`.\n' +
        '    in RenderTestUndefinedRender (at **)',
    ]);
  });

  // Regression test for accidental breaking change
  // https://github.com/facebook/react/issues/13580
  it('should support classes shadowing isReactComponent', async () => {
    class Shadow extends React.Component {
      isReactComponent() {}
      render() {
        return <div />;
      }
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Shadow />);
    });
    expect(container.firstChild.tagName).toBe('DIV');
  });

  it('should not warn on updating function component from componentWillMount', async () => {
    let setState;
    let ref;
    function A() {
      const [state, _setState] = React.useState(null);
      setState = _setState;
      return <div ref={r => (ref = r)}>{state}</div>;
    }
    class B extends React.Component {
      UNSAFE_componentWillMount() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe('1');
  });

  it('should not warn on updating function component from componentWillUpdate', async () => {
    let setState;
    let ref;
    function A() {
      const [state, _setState] = React.useState();
      setState = _setState;
      return <div ref={r => (ref = r)}>{state}</div>;
    }
    class B extends React.Component {
      UNSAFE_componentWillUpdate() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe('1');
  });

  it('should not warn on updating function component from componentWillReceiveProps', async () => {
    let setState;
    let ref;
    function A() {
      const [state, _setState] = React.useState();
      setState = _setState;
      return <div ref={r => (ref = r)}>{state}</div>;
    }

    class B extends React.Component {
      UNSAFE_componentWillReceiveProps() {
        setState(1);
      }
      render() {
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });
    await act(() => {
      root.render(<Parent />);
    });

    expect(ref.textContent).toBe('1');
  });

  it('should warn on updating function component from render', () => {
    let setState;
    let ref;
    function A() {
      const [state, _setState] = React.useState(0);
      setState = _setState;
      return <div ref={r => (ref = r)}>{state}</div>;
    }

    class B extends React.Component {
      render() {
        setState(c => c + 1);
        return null;
      }
    }
    function Parent() {
      return (
        <div>
          <A />
          <B />
        </div>
      );
    }
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    ReactDOM.flushSync(() => {
      root.render(<Parent />);
    });
    assertConsoleErrorDev([
      'Cannot update a component (`A`) while rendering a different component (`B`). ' +
        'To locate the bad setState() call inside `B`, ' +
        'follow the stack trace as described in https://react.dev/link/setstate-in-render\n' +
        '    in Parent (at **)',
    ]);

    // We error, but still update the state.
    expect(ref.textContent).toBe('1');

    // Dedupe.
    ReactDOM.flushSync(() => {
      root.render(<Parent />);
    });

    // We error, but still update the state.
    expect(ref.textContent).toBe('2');
  });
});
