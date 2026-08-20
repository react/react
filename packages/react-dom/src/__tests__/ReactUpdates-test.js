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
let act;
let Scheduler;
let waitForAll;
let waitFor;
let assertLog;
let assertConsoleErrorDev;

function normalizeCodeLocInfo(str) {
  return (
    str &&
    str.replace(/^ +(?:at|in) ([\S]+)[^\n]*/gm, function (m, name) {
      const dot = name.lastIndexOf('.');
      if (dot !== -1) {
        name = name.slice(dot + 1);
      }
      return '    in ' + name + (/\d/.test(m) ? ' (at **)' : '');
    })
  );
}

describe('ReactUpdates', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactDOM = require('react-dom');
    ReactDOMClient = require('react-dom/client');
    findDOMNode =
      ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
        .findDOMNode;
    act = require('internal-test-utils').act;
    assertConsoleErrorDev =
      require('internal-test-utils').assertConsoleErrorDev;
    Scheduler = require('scheduler');

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;
  });

  // Note: This is based on a similar component we use in www. We can delete
  // once the extra div wrapper is no longer necessary.
  function LegacyHiddenDiv({children, mode}) {
    return (
      <div hidden={mode === 'hidden'}>
        <React.unstable_LegacyHidden
          mode={mode === 'hidden' ? 'unstable-defer-without-hiding' : mode}>
          {children}
        </React.unstable_LegacyHidden>
      </div>
    );
  }

  it('should batch state when updating state twice', async () => {
    let componentState;
    let setState;

    function Component() {
      const [state, _setState] = React.useState(0);
      componentState = state;
      setState = _setState;
      React.useLayoutEffect(() => {
        Scheduler.log('Commit');
      });

      return <div>{state}</div>;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('0');

    await act(() => {
      setState(1);
      setState(2);
      expect(componentState).toBe(0);
      expect(container.firstChild.textContent).toBe('0');
      assertLog([]);
    });

    expect(componentState).toBe(2);
    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('2');
  });

  it('should batch state when updating two different states', async () => {
    let componentStateA;
    let componentStateB;
    let setStateA;
    let setStateB;

    function Component() {
      const [stateA, _setStateA] = React.useState(0);
      const [stateB, _setStateB] = React.useState(0);
      componentStateA = stateA;
      componentStateB = stateB;
      setStateA = _setStateA;
      setStateB = _setStateB;

      React.useLayoutEffect(() => {
        Scheduler.log('Commit');
      });

      return (
        <div>
          {stateA} {stateB}
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('0 0');

    await act(() => {
      setStateA(1);
      setStateB(2);
      expect(componentStateA).toBe(0);
      expect(componentStateB).toBe(0);
      expect(container.firstChild.textContent).toBe('0 0');
      assertLog([]);
    });

    expect(componentStateA).toBe(1);
    expect(componentStateB).toBe(2);
    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('1 2');
  });

  it('should batch state and props together', async () => {
    let setState;
    let componentProp;
    let componentState;

    function Component({prop}) {
      const [state, _setState] = React.useState(0);
      componentProp = prop;
      componentState = state;
      setState = _setState;

      React.useLayoutEffect(() => {
        Scheduler.log('Commit');
      });

      return (
        <div>
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component prop={0} />);
    });

    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('0 0');

    await act(() => {
      root.render(<Component prop={1} />);
      setState(2);
      expect(componentProp).toBe(0);
      expect(componentState).toBe(0);
      expect(container.firstChild.textContent).toBe('0 0');
      assertLog([]);
    });

    expect(componentProp).toBe(1);
    expect(componentState).toBe(2);
    assertLog(['Commit']);
    expect(container.firstChild.textContent).toBe('1 2');
  });

  it('should batch parent/child state updates together', async () => {
    let childRef;
    let parentState;
    let childState;
    let setParentState;
    let setChildState;

    function Parent() {
      const [state, _setState] = React.useState(0);
      parentState = state;
      setParentState = _setState;

      React.useLayoutEffect(() => {
        Scheduler.log('Parent Commit');
      });

      return (
        <div>
          <Child prop={state} />
        </div>
      );
    }

    function Child({prop}) {
      const [state, _setState] = React.useState(0);
      childState = state;
      setChildState = _setState;

      React.useLayoutEffect(() => {
        Scheduler.log('Child Commit');
      });

      return (
        <div
          ref={ref => {
            childRef = ref;
          }}>
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(['Child Commit', 'Parent Commit']);
    expect(childRef.textContent).toBe('0 0');

    await act(() => {
      // Parent update first.
      setParentState(1);
      setChildState(2);
      expect(parentState).toBe(0);
      expect(childState).toBe(0);
      expect(childRef.textContent).toBe('0 0');
      assertLog([]);
    });

    expect(parentState).toBe(1);
    expect(childState).toBe(2);
    expect(childRef.textContent).toBe('1 2');
    assertLog(['Child Commit', 'Parent Commit']);
  });

  it('should batch child/parent state updates together', async () => {
    let childRef;
    let parentState;
    let childState;
    let setParentState;
    let setChildState;

    function Parent() {
      const [state, _setState] = React.useState(0);
      parentState = state;
      setParentState = _setState;

      React.useLayoutEffect(() => {
        Scheduler.log('Parent Commit');
      });

      return (
        <div>
          <Child prop={state} />
        </div>
      );
    }

    function Child({prop}) {
      const [state, _setState] = React.useState(0);
      childState = state;
      setChildState = _setState;

      React.useLayoutEffect(() => {
        Scheduler.log('Child Commit');
      });

      return (
        <div
          ref={ref => {
            childRef = ref;
          }}>
          {prop} {state}
        </div>
      );
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(['Child Commit', 'Parent Commit']);
    expect(childRef.textContent).toBe('0 0');

    await act(() => {
      // Child update first.
      setChildState(2);
      setParentState(1);
      expect(parentState).toBe(0);
      expect(childState).toBe(0);
      expect(childRef.textContent).toBe('0 0');
      assertLog([]);
    });

    expect(parentState).toBe(1);
    expect(childState).toBe(2);
    expect(childRef.textContent).toBe('1 2');
    assertLog(['Child Commit', 'Parent Commit']);
  });

  it('should support chained state updates', async () => {
    let instance;
    class Component extends React.Component {
      state = {x: 0};
      constructor(props) {
        super(props);
        instance = this;
      }

      componentDidUpdate() {
        Scheduler.log('Update');
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    expect(instance.state.x).toBe(0);
    expect(container.firstChild.textContent).toBe('0');

    let innerCallbackRun = false;
    await act(() => {
      instance.setState({x: 1}, function () {
        instance.setState({x: 2}, function () {
          innerCallbackRun = true;
          expect(instance.state.x).toBe(2);
          expect(container.firstChild.textContent).toBe('2');
          assertLog(['Update']);
        });
        expect(instance.state.x).toBe(1);
        expect(container.firstChild.textContent).toBe('1');
        assertLog(['Update']);
      });
      expect(instance.state.x).toBe(0);
      expect(container.firstChild.textContent).toBe('0');
      assertLog([]);
    });

    assertLog([]);
    expect(instance.state.x).toBe(2);
    expect(innerCallbackRun).toBeTruthy();
    expect(container.firstChild.textContent).toBe('2');
  });

  it('should batch forceUpdate together', async () => {
    let instance;
    let shouldUpdateCount = 0;
    class Component extends React.Component {
      state = {x: 0};

      constructor(props) {
        super(props);
        instance = this;
      }
      shouldComponentUpdate() {
        shouldUpdateCount++;
      }

      componentDidUpdate() {
        Scheduler.log('Update');
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Component />);
    });

    assertLog([]);
    expect(instance.state.x).toBe(0);

    await act(() => {
      instance.setState({x: 1}, function () {
        Scheduler.log('callback');
      });
      instance.forceUpdate(function () {
        Scheduler.log('forceUpdate');
      });
      assertLog([]);
      expect(instance.state.x).toBe(0);
      expect(container.firstChild.textContent).toBe('0');
    });

    // shouldComponentUpdate shouldn't be called since we're forcing
    expect(shouldUpdateCount).toBe(0);
    assertLog(['Update', 'callback', 'forceUpdate']);
    expect(instance.state.x).toBe(1);
    expect(container.firstChild.textContent).toBe('1');
  });

  it('should update children even if parent blocks updates', async () => {
    let instance;
    class Parent extends React.Component {
      childRef = React.createRef();

      constructor(props) {
        super(props);
        instance = this;
      }
      shouldComponentUpdate() {
        return false;
      }

      render() {
        Scheduler.log('Parent render');
        return <Child ref={this.childRef} />;
      }
    }

    class Child extends React.Component {
      render() {
        Scheduler.log('Child render');
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    assertLog(['Parent render', 'Child render']);

    await act(() => {
      instance.setState({x: 1});
    });

    assertLog([]);

    await act(() => {
      instance.childRef.current.setState({x: 1});
    });

    assertLog(['Child render']);
  });

  it('should not reconcile children passed via props', async () => {
    class Top extends React.Component {
      render() {
        return (
          <Middle>
            <Bottom />
          </Middle>
        );
      }
    }

    class Middle extends React.Component {
      componentDidMount() {
        this.forceUpdate();
      }

      render() {
        Scheduler.log('Middle');
        return React.Children.only(this.props.children);
      }
    }

    class Bottom extends React.Component {
      render() {
        Scheduler.log('Bottom');
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Top />);
    });

    assertLog(['Middle', 'Bottom', 'Middle']);
  });

  it('should flow updates correctly', async () => {
    let willUpdates = [];
    let didUpdates = [];
    let instance;

    const UpdateLoggingMixin = {
      UNSAFE_componentWillUpdate: function () {
        willUpdates.push(this.constructor.displayName);
      },
      componentDidUpdate: function () {
        didUpdates.push(this.constructor.displayName);
      },
    };

    class Box extends React.Component {
      boxDivRef = React.createRef();

      render() {
        return <div ref={this.boxDivRef}>{this.props.children}</div>;
      }
    }
    Object.assign(Box.prototype, UpdateLoggingMixin);

    class Child extends React.Component {
      spanRef = React.createRef();

      render() {
        return <span ref={this.spanRef}>child</span>;
      }
    }
    Object.assign(Child.prototype, UpdateLoggingMixin);

    class Switcher extends React.Component {
      state = {tabKey: 'hello'};
      boxRef = React.createRef();
      switcherDivRef = React.createRef();
      render() {
        const child = this.props.children;

        return (
          <Box ref={this.boxRef}>
            <div
              ref={this.switcherDivRef}
              style={{
                display: this.state.tabKey === child.key ? '' : 'none',
              }}>
              {child}
            </div>
          </Box>
        );
      }
    }
    Object.assign(Switcher.prototype, UpdateLoggingMixin);

    class App extends React.Component {
      switcherRef = React.createRef();
      childRef = React.createRef();
      constructor(props) {
        super(props);
        instance = this;
      }
      render() {
        return (
          <Switcher ref={this.switcherRef}>
            <Child key="hello" ref={this.childRef} />
          </Switcher>
        );
      }
    }
    Object.assign(App.prototype, UpdateLoggingMixin);

    const container = document.createElement('div');
    await act(() => {
      ReactDOMClient.createRoot(container).render(<App />);
    });

    function expectUpdates(desiredWillUpdates, desiredDidUpdates) {
      let i;
      for (i = 0; i < desiredWillUpdates; i++) {
        expect(willUpdates).toContain(desiredWillUpdates[i]);
      }
      for (i = 0; i < desiredDidUpdates; i++) {
        expect(didUpdates).toContain(desiredDidUpdates[i]);
      }
      willUpdates = [];
      didUpdates = [];
    }

    function triggerUpdate(c) {
      c.setState({x: 1});
    }

    async function testUpdates(
      components,
      desiredWillUpdates,
      desiredDidUpdates,
    ) {
      let i;

      await act(() => {
        for (i = 0; i < components.length; i++) {
          triggerUpdate(components[i]);
        }
      });

      expectUpdates(desiredWillUpdates, desiredDidUpdates);

      // Try them in reverse order

      await act(() => {
        for (i = components.length - 1; i >= 0; i--) {
          triggerUpdate(components[i]);
        }
      });

      expectUpdates(desiredWillUpdates, desiredDidUpdates);
    }
    await testUpdates(
      [
        instance.switcherRef.current.boxRef.current,
        instance.switcherRef.current,
      ],
      // Owner-child relationships have inverse will and did
      ['Switcher', 'Box'],
      ['Box', 'Switcher'],
    );

    await testUpdates(
      [instance.childRef.current, instance.switcherRef.current.boxRef.current],
      // Not owner-child so reconcile independently
      ['Box', 'Child'],
      ['Box', 'Child'],
    );

    await testUpdates(
      [instance.childRef.current, instance.switcherRef.current],
      // Switcher owns Box and Child, Box does not own Child
      ['Switcher', 'Box', 'Child'],
      ['Box', 'Switcher', 'Child'],
    );
  });

  it('should queue mount-ready handlers across different roots', async () => {
    // We'll define two components A and B, then update both of them. When A's
    // componentDidUpdate handlers is called, B's DOM should already have been
    // updated.

    const bContainer = document.createElement('div');
    let a;
    let b;

    let aUpdated = false;

    class A extends React.Component {
      state = {x: 0};
      constructor(props) {
        super(props);
        a = this;
      }
      componentDidUpdate() {
        expect(findDOMNode(b).textContent).toBe('B1');
        aUpdated = true;
      }

      render() {
        let portal = null;
        portal = ReactDOM.createPortal(<B ref={n => (b = n)} />, bContainer);
        return (
          <div>
            A{this.state.x}
            {portal}
          </div>
        );
      }
    }

    class B extends React.Component {
      state = {x: 0};

      render() {
        return <div>B{this.state.x}</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A />);
    });

    await act(() => {
      a.setState({x: 1});
      b.setState({x: 1});
    });

    expect(aUpdated).toBe(true);
  });

  it('should flush updates in the correct order', async () => {
    const updates = [];
    let instance;
    class Outer extends React.Component {
      state = {x: 0};
      innerRef = React.createRef();
      constructor(props) {
        super(props);
        instance = this;
      }
      render() {
        updates.push('Outer-render-' + this.state.x);
        return (
          <div>
            <Inner x={this.state.x} ref={this.innerRef} />
          </div>
        );
      }

      componentDidUpdate() {
        const x = this.state.x;
        updates.push('Outer-didUpdate-' + x);
        updates.push('Inner-setState-' + x);
        this.innerRef.current.setState({x: x}, function () {
          updates.push('Inner-callback-' + x);
        });
      }
    }

    class Inner extends React.Component {
      state = {x: 0};

      render() {
        updates.push('Inner-render-' + this.props.x + '-' + this.state.x);
        return <div />;
      }

      componentDidUpdate() {
        updates.push('Inner-didUpdate-' + this.props.x + '-' + this.state.x);
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Outer />);
    });

    await act(() => {
      updates.push('Outer-setState-1');
      instance.setState({x: 1}, function () {
        updates.push('Outer-callback-1');
        updates.push('Outer-setState-2');
        instance.setState({x: 2}, function () {
          updates.push('Outer-callback-2');
        });
      });
    });

    expect(updates).toEqual([
      'Outer-render-0',
      'Inner-render-0-0',

      'Outer-setState-1',
      'Outer-render-1',
      'Inner-render-1-0',
      'Inner-didUpdate-1-0',
      'Outer-didUpdate-1',
      // Happens in a batch, so don't re-render yet
      'Inner-setState-1',
      'Outer-callback-1',

      // Happens in a batch
      'Outer-setState-2',

      // Flush batched updates all at once
      'Outer-render-2',
      'Inner-render-2-1',
      'Inner-didUpdate-2-1',
      'Inner-callback-1',
      'Outer-didUpdate-2',
      'Inner-setState-2',
      'Outer-callback-2',
      'Inner-render-2-2',
      'Inner-didUpdate-2-2',
      'Inner-callback-2',
    ]);
  });

  it('should flush updates in the correct order across roots', async () => {
    const instances = [];
    const updates = [];

    class MockComponent extends React.Component {
      render() {
        updates.push(this.props.depth);
        return <div />;
      }

      componentDidMount() {
        instances.push(this);
        if (this.props.depth < this.props.count) {
          const root = ReactDOMClient.createRoot(findDOMNode(this));
          root.render(
            <MockComponent
              depth={this.props.depth + 1}
              count={this.props.count}
            />,
          );
        }
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<MockComponent depth={0} count={2} />);
    });

    expect(updates).toEqual([0, 1, 2]);

    await act(() => {
      // Simulate update on each component from top to bottom.
      instances.forEach(function (instance) {
        instance.forceUpdate();
      });
    });

    expect(updates).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('should queue nested updates', async () => {
    // See https://github.com/facebook/react/issues/1147

    class X extends React.Component {
      state = {s: 0};

      render() {
        if (this.state.s === 0) {
          return (
            <div>
              <span>0</span>
            </div>
          );
        } else {
          return <div>1</div>;
        }
      }

      go = () => {
        this.setState({s: 1});
        this.setState({s: 0});
        this.setState({s: 1});
      };
    }

    class Y extends React.Component {
      render() {
        return (
          <div>
            <Z />
          </div>
        );
      }
    }

    class Z extends React.Component {
      render() {
        return <div />;
      }

      UNSAFE_componentWillUpdate() {
        x.go();
      }
    }

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    let x;
    await act(() => {
      root.render(<X ref={current => (x = current)} />);
    });

    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    let y;
    await act(() => {
      root.render(<Y ref={current => (y = current)} />);
    });

    expect(findDOMNode(x).textContent).toBe('0');

    await act(() => {
      y.forceUpdate();
    });
    expect(findDOMNode(x).textContent).toBe('1');
  });

  it('should queue updates from during mount', async () => {
    // See https://github.com/facebook/react/issues/1353
    let a;

    class A extends React.Component {
      state = {x: 0};

      UNSAFE_componentWillMount() {
        a = this;
      }

      render() {
        return <div>A{this.state.x}</div>;
      }
    }

    class B extends React.Component {
      UNSAFE_componentWillMount() {
        a.setState({x: 1});
      }

      render() {
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div>
          <A />
          <B />
        </div>,
      );
    });

    expect(container.firstChild.textContent).toBe('A1');
  });

  it('calls componentWillReceiveProps setState callback properly', async () => {
    class A extends React.Component {
      state = {x: this.props.x};

      UNSAFE_componentWillReceiveProps(nextProps) {
        const newX = nextProps.x;
        this.setState({x: newX}, function () {
          // State should have updated by the time this callback gets called
          expect(this.state.x).toBe(newX);
          Scheduler.log('Callback');
        });
      }

      render() {
        return <div>{this.state.x}</div>;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A x={1} />);
    });
    assertLog([]);

    // Needs to be a separate act, or it will be batched.
    await act(() => {
      root.render(<A x={2} />);
    });

    assertLog(['Callback']);
  });

  it('does not call render after a component as been deleted', async () => {
    let componentA = null;
    let componentB = null;

    class B extends React.Component {
      state = {updates: 0};

      componentDidMount() {
        componentB = this;
      }

      render() {
        Scheduler.log('B');
        return <div />;
      }
    }

    class A extends React.Component {
      state = {showB: true};

      componentDidMount() {
        componentA = this;
      }
      render() {
        return this.state.showB ? <B /> : <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A />);
    });
    assertLog(['B']);

    await act(() => {
      // B will have scheduled an update but the batching should ensure that its
      // update never fires.
      componentB.setState({updates: 1});
      componentA.setState({showB: false});
    });

    assertLog([]);
  });

  it('throws in setState if the update callback is not a function', async () => {
    function Foo() {
      this.a = 1;
      this.b = 2;
    }

    class A extends React.Component {
      state = {};

      render() {
        return <div />;
      }
    }

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    let component;
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(async () => {
      await act(() => {
        component.setState({}, 'no');
      });
    }).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: no',
    );
    assertConsoleErrorDev([
      'Expected the last optional `callback` argument to be ' +
        'a function. Instead received: no.',
    ]);
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(async () => {
      await act(() => {
        component.setState({}, {foo: 'bar'});
      });
    }).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: [object Object]',
    );
    assertConsoleErrorDev([
      'Expected the last optional `callback` argument to be ' +
        "a function. Instead received: { foo: 'bar' }.",
    ]);
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(
      act(() => {
        component.setState({}, new Foo());
      }),
    ).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: [object Object]',
    );
  });

  it('throws in forceUpdate if the update callback is not a function', async () => {
    function Foo() {
      this.a = 1;
      this.b = 2;
    }

    class A extends React.Component {
      state = {};

      render() {
        return <div />;
      }
    }

    let container = document.createElement('div');
    let root = ReactDOMClient.createRoot(container);
    let component;
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(async () => {
      await act(() => {
        component.forceUpdate('no');
      });
    }).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: no',
    );
    assertConsoleErrorDev([
      'Expected the last optional `callback` argument to be ' +
        'a function. Instead received: no.',
    ]);
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(async () => {
      await act(() => {
        component.forceUpdate({foo: 'bar'});
      });
    }).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: [object Object]',
    );
    assertConsoleErrorDev([
      'Expected the last optional `callback` argument to be ' +
        "a function. Instead received: { foo: 'bar' }.",
    ]);
    // Make sure the warning is deduplicated and doesn't fire again
    container = document.createElement('div');
    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<A ref={current => (component = current)} />);
    });

    await expect(
      act(() => {
        component.forceUpdate(new Foo());
      }),
    ).rejects.toThrowError(
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: [object Object]',
    );
  });

  it('does not update one component twice in a batch (#2410)', async () => {
    let parent;
    class Parent extends React.Component {
      childRef = React.createRef();

      componentDidMount() {
        parent = this;
      }
      getChild = () => {
        return this.childRef.current;
      };

      render() {
        return <Child ref={this.childRef} />;
      }
    }

    let renderCount = 0;
    let postRenderCount = 0;
    let once = false;

    class Child extends React.Component {
      state = {updated: false};

      UNSAFE_componentWillUpdate() {
        if (!once) {
          once = true;
          this.setState({updated: true});
        }
      }

      componentDidMount() {
        expect(renderCount).toBe(postRenderCount + 1);
        postRenderCount++;
      }

      componentDidUpdate() {
        expect(renderCount).toBe(postRenderCount + 1);
        postRenderCount++;
      }

      render() {
        expect(renderCount).toBe(postRenderCount);
        renderCount++;
        return <div />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Parent />);
    });

    const child = parent.getChild();
    await act(() => {
      parent.forceUpdate();
      child.forceUpdate();
    });

    expect.assertions(6);
  });

  it('does not update one component twice in a batch (#6371)', async () => {
    let callbacks = [];
    function emitChange() {
      callbacks.forEach(c => c());
    }

    class App extends React.Component {
      constructor(props) {
        super(props);
        this.state = {showChild: true};
      }
      componentDidMount() {
        this.setState({showChild: false});
      }
      render() {
        return (
          <div>
            <ForceUpdatesOnChange />
            {this.state.showChild && <EmitsChangeOnUnmount />}
          </div>
        );
      }
    }

    class EmitsChangeOnUnmount extends React.Component {
      componentWillUnmount() {
        emitChange();
      }
      render() {
        return null;
      }
    }

    class ForceUpdatesOnChange extends React.Component {
      componentDidMount() {
        this.onChange = () => this.forceUpdate();
        this.onChange();
        callbacks.push(this.onChange);
      }
      componentWillUnmount() {
        callbacks = callbacks.filter(c => c !== this.onChange);
      }
      render() {
        return <div key={Math.random()} onClick={function () {}} />;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<App />);
    });

    // Error should not be thrown.
    expect(true).toBe(true);
  });

  it('handles reentrant mounting in synchronous mode', async () => {
    let onChangeCalled = false;
    class Editor extends React.Component {
      render() {
        return <div>{this.props.text}</div>;
      }
      componentDidMount() {
        Scheduler.log('Mount');
        // This should be called only once but we guard just in case.
        if (!this.props.rendered) {
          this.props.onChange({rendered: true});
        }
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    function render() {
      root.render(
        <Editor
          onChange={newProps => {
            onChangeCalled = true;
            props = {...props, ...newProps};
            render();
          }}
          {...props}
        />,
      );
    }

    let props = {text: 'hello', rendered: false};
    await act(() => {
      render();
    });
    assertLog(['Mount']);
    props = {...props, text: 'goodbye'};
    await act(() => {
      render();
    });

    assertLog([]);
    expect(container.textContent).toBe('goodbye');
    expect(onChangeCalled).toBeTruthy();
  });

  it('mounts and unmounts are batched', async () => {
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(<div>Hello</div>);
      expect(container.textContent).toBe('');
      root.unmount(container);
      expect(container.textContent).toBe('');
    });

    expect(container.textContent).toBe('');
  });

  it('uses correct base state for setState inside render phase', async () => {
    class Foo extends React.Component {
      state = {step: 0};
      render() {
        const memoizedStep = this.state.step;
        this.setState(baseState => {
          const baseStep = baseState.step;
          Scheduler.log(`base: ${baseStep}, memoized: ${memoizedStep}`);
          return baseStep === 0 ? {step: 1} : null;
        });
        return null;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });
    assertConsoleErrorDev([
      'Cannot update during an existing state transition (such as within `render`). ' +
        'Render methods should be a pure function of props and state.\n' +
        '    in Foo (at **)',
    ]);

    assertLog(['base: 0, memoized: 0', 'base: 1, memoized: 1']);
  });

  it('does not re-render if state update is null', async () => {
    const container = document.createElement('div');

    let instance;
    class Foo extends React.Component {
      render() {
        instance = this;
        Scheduler.log('render');
        return <div />;
      }
    }
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<Foo />);
    });

    assertLog(['render']);
    await act(() => {
      instance.setState(() => null);
    });
    assertLog([]);
  });

  it('synchronously renders hidden subtrees', async () => {
    const container = document.createElement('div');

    function Baz() {
      Scheduler.log('Baz');
      return null;
    }

    function Bar() {
      Scheduler.log('Bar');
      return null;
    }

    function Foo() {
      Scheduler.log('Foo');
      return (
        <div>
          <div hidden={true}>
            <Bar />
          </div>
          <Baz />
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      // Mount
      root.render(<Foo />);
    });
    assertLog(['Foo', 'Bar', 'Baz']);

    await act(() => {
      // Update
      root.render(<Foo />);
    });
    assertLog(['Foo', 'Bar', 'Baz']);
  });

  // @gate www
  it('delays sync updates inside hidden subtrees in Concurrent Mode', async () => {
    const container = document.createElement('div');

    function Baz() {
      Scheduler.log('Baz');
      return <p>baz</p>;
    }

    let setCounter;
    function Bar() {
      const [counter, _setCounter] = React.useState(0);
      setCounter = _setCounter;
      Scheduler.log('Bar');
      return <p>bar {counter}</p>;
    }

    function Foo() {
      Scheduler.log('Foo');
      React.useEffect(() => {
        Scheduler.log('Foo#effect');
      });
      return (
        <div>
          <LegacyHiddenDiv mode="hidden">
            <Bar />
          </LegacyHiddenDiv>
          <Baz />
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(container);
    let hiddenDiv;
    await act(async () => {
      root.render(<Foo />);
      await waitFor(['Foo', 'Baz', 'Foo#effect']);
      hiddenDiv = container.firstChild.firstChild;
      expect(hiddenDiv.hidden).toBe(true);
      expect(hiddenDiv.innerHTML).toBe('');
      // Run offscreen update
      await waitForAll(['Bar']);
      expect(hiddenDiv.hidden).toBe(true);
      expect(hiddenDiv.innerHTML).toBe('<p>bar 0</p>');
    });

    ReactDOM.flushSync(() => {
      setCounter(1);
    });
    // Should not flush yet
    expect(hiddenDiv.innerHTML).toBe('<p>bar 0</p>');

    // Run offscreen update
    await waitForAll(['Bar']);
    expect(hiddenDiv.innerHTML).toBe('<p>bar 1</p>');
  });

  it('can render ridiculously large number of roots without triggering infinite update loop error', async () => {
    function Component({trigger}) {
      const [state, setState] = React.useState(0);

      React.useEffect(() => {
        if (trigger) {
          Scheduler.log('Trigger');
          setState(c => c + 1);
        }
      }, [trigger]);

      return <div>{state}</div>;
    }

    class Foo extends React.Component {
      componentDidMount() {
        const limit = 1200;
        for (let i = 0; i < limit; i++) {
          if (i < limit - 1) {
            ReactDOMClient.createRoot(document.createElement('div')).render(
              <Component />,
            );
          } else {
            // The "nested update limit" error isn't thrown until setState
            ReactDOMClient.createRoot(document.createElement('div')).render(
              <Component trigger={true} />,
            );
          }
        }
      }
      render() {
        return null;
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Foo />);
    });

    // Make sure the setState trigger runs.
    assertLog(['Trigger']);
  });

  it('resets the update counter for unrelated updates', async () => {
    const container = document.createElement('div');
    const ref = React.createRef();

    class EventuallyTerminating extends React.Component {
      state = {step: 0};
      componentDidMount() {
        this.setState({step: 1});
      }
      componentDidUpdate() {
        if (this.state.step < limit) {
          this.setState({step: this.state.step + 1});
        }
      }
      render() {
        return this.state.step;
      }
    }

    let limit = 55;
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<EventuallyTerminating ref={ref} />);
      });
    }).rejects.toThrow('Maximum');

    // Verify that we don't go over the limit if these updates are unrelated.
    limit -= 10;
    await act(() => {
      root.render(<EventuallyTerminating ref={ref} />);
    });
    expect(container.textContent).toBe(limit.toString());

    await act(() => {
      ref.current.setState({step: 0});
    });
    expect(container.textContent).toBe(limit.toString());

    await act(() => {
      ref.current.setState({step: 0});
    });
    expect(container.textContent).toBe(limit.toString());

    limit += 10;
    await expect(async () => {
      await act(() => {
        ref.current.setState({step: 0});
      });
    }).rejects.toThrow('Maximum');
    expect(ref.current).toBe(null);
  });

  it('does not fall into an infinite update loop', async () => {
    class NonTerminating extends React.Component {
      state = {step: 0};

      componentDidMount() {
        this.setState({step: 1});
      }

      componentDidUpdate() {
        this.setState({step: 2});
      }

      render() {
        return (
          <div>
            Hello {this.props.name}
            {this.state.step}
          </div>
        );
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);

    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow('Maximum');
  });

  it('does not fall into an infinite update loop with useLayoutEffect', async () => {
    function NonTerminating() {
      const [step, setStep] = React.useState(0);
      React.useLayoutEffect(() => {
        setStep(x => x + 1);
      });
      return step;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow('Maximum');
  });

  it('can recover after falling into an infinite update loop', async () => {
    class NonTerminating extends React.Component {
      state = {step: 0};
      componentDidMount() {
        this.setState({step: 1});
      }
      componentDidUpdate() {
        this.setState({step: 2});
      }
      render() {
        return this.state.step;
      }
    }

    class Terminating extends React.Component {
      state = {step: 0};
      componentDidMount() {
        this.setState({step: 1});
      }
      render() {
        return this.state.step;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow('Maximum');

    await act(() => {
      root.render(<Terminating />);
    });
    expect(container.textContent).toBe('1');

    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow('Maximum');
    await act(() => {
      root.render(<Terminating />);
    });
    expect(container.textContent).toBe('1');
  });

  it('does not fall into mutually recursive infinite update loop with same container', async () => {
    // Note: this test would fail if there were two or more different roots.
    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    class A extends React.Component {
      componentDidMount() {
        root.render(<B />);
      }
      render() {
        return null;
      }
    }

    class B extends React.Component {
      componentDidMount() {
        root.render(<A />);
      }
      render() {
        return null;
      }
    }

    await expect(async () => {
      await act(() => {
        root.render(<A />);
      });
    }).rejects.toThrow('Maximum');
  });

  it('does not fall into an infinite error loop', async () => {
    function BadRender() {
      throw new Error('error');
    }

    class ErrorBoundary extends React.Component {
      componentDidCatch() {
        // Schedule a no-op state update to avoid triggering a DEV warning in the test.
        this.setState({});

        this.props.parent.remount();
      }
      render() {
        return <BadRender />;
      }
    }

    class NonTerminating extends React.Component {
      state = {step: 0};
      remount() {
        this.setState(state => ({step: state.step + 1}));
      }
      render() {
        return <ErrorBoundary key={this.state.step} parent={this} />;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await expect(async () => {
      await act(() => {
        root.render(<NonTerminating />);
      });
    }).rejects.toThrow('Maximum');
  });

  it('can schedule ridiculously many updates within the same batch without triggering a maximum update error', async () => {
    const subscribers = [];
    const limit = 1200;
    class Child extends React.Component {
      state = {value: 'initial'};
      componentDidMount() {
        subscribers.push(this);
      }
      render() {
        return null;
      }
    }

    class App extends React.Component {
      render() {
        const children = [];
        for (let i = 0; i < limit; i++) {
          children.push(<Child key={i} />);
        }
        return children;
      }
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<App />);
    });

    await act(() => {
      subscribers.forEach(s => {
        s.setState({value: 'update'});
      });
    });

    expect(subscribers.length).toBe(limit);
  });

  it("warns about potential infinite loop if there's a synchronous render phase update on another component", async () => {
    if (
      !__DEV__ ||
      gate(
        flags =>
          !flags.enableInfiniteRenderLoopDetection ||
          flags.enableInfiniteRenderLoopDetectionForceThrow,
      )
    ) {
      return;
    }
    let setState;
    function App() {
      const [, _setState] = React.useState(0);
      setState = _setState;
      return <Child />;
    }

    function Child(step) {
      // This will cause an infinite update loop, and a warning in dev.
      setState(n => n + 1);
      return null;
    }

    const originalConsoleError = console.error;
    console.error = e => {
      if (
        typeof e === 'string' &&
        e.startsWith(
          'Maximum update depth exceeded. This could be an infinite loop.',
        )
      ) {
        Scheduler.log('stop');
      }
    };
    try {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      root.render(<App />);
      await waitFor(['stop']);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("warns about potential infinite loop if there's an async render phase update on another component", async () => {
    if (
      !__DEV__ ||
      gate(
        flags =>
          !flags.enableInfiniteRenderLoopDetection ||
          flags.enableInfiniteRenderLoopDetectionForceThrow,
      )
    ) {
      return;
    }
    let setState;
    function App() {
      const [, _setState] = React.useState(0);
      setState = _setState;
      return <Child />;
    }

    function Child(step) {
      // This will cause an infinite update loop, and a warning in dev.
      setState(n => n + 1);
      return null;
    }

    const originalConsoleError = console.error;
    console.error = e => {
      if (
        typeof e === 'string' &&
        e.startsWith(
          'Maximum update depth exceeded. This could be an infinite loop.',
        )
      ) {
        Scheduler.log('stop');
      }
    };
    try {
      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      React.startTransition(() => root.render(<App />));
      await waitFor(['stop']);
    } finally {
      console.error = originalConsoleError;
    }
  });

  // TODO: Replace this branch with @gate pragmas
  if (__DEV__) {
    it('warns about a deferred infinite update loop with useEffect', async () => {
      function NonTerminating() {
        const [step, setStep] = React.useState(0);
        React.useEffect(function myEffect() {
          setStep(x => x + 1);
        });
        return step;
      }

      function App() {
        return <NonTerminating />;
      }

      let error = null;
      let ownerStack = null;
      let debugStack = null;
      const originalConsoleError = console.error;
      console.error = e => {
        error = e;
        ownerStack = React.captureOwnerStack();
        debugStack = new Error().stack;
        Scheduler.log('stop');
      };
      try {
        const container = document.createElement('div');
        const root = ReactDOMClient.createRoot(container);
        root.render(<App />);
        await waitFor(['stop']);
      } finally {
        console.error = originalConsoleError;
      }

      expect(error).toContain('Maximum update depth exceeded');
      // The currently executing effect should be on the native stack
      expect(debugStack).toContain('at myEffect');
      expect(ownerStack).toContain('at App');
    });

    it('can have nested updates if they do not cross the limit', async () => {
      let _setStep;
      const LIMIT = 50;

      function Terminating() {
        const [step, setStep] = React.useState(0);
        _setStep = setStep;
        React.useEffect(() => {
          if (step < LIMIT) {
            setStep(x => x + 1);
          }
        });
        Scheduler.log(step);
        return step;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Terminating />);
      });

      assertLog(Array.from({length: LIMIT + 1}, (_, k) => k));
      expect(container.textContent).toBe('50');
      await act(() => {
        _setStep(0);
      });
      expect(container.textContent).toBe('50');
    });

    it('can have many updates inside useEffect without triggering a warning', async () => {
      function Terminating() {
        const [step, setStep] = React.useState(0);
        React.useEffect(() => {
          for (let i = 0; i < 1000; i++) {
            setStep(x => x + 1);
          }
          Scheduler.log('Done');
        }, []);
        return step;
      }

      const container = document.createElement('div');
      const root = ReactDOMClient.createRoot(container);
      await act(() => {
        root.render(<Terminating />);
      });

      assertLog(['Done']);
      expect(container.textContent).toBe('1000');
    });
  }

  it('prevents infinite update loop triggered by synchronous updates in useEffect', async () => {
    // Ignore flushSync warning
    spyOnDev(console, 'error').mockImplementation(() => {});

    function NonTerminating() {
      const [step, setStep] = React.useState(0);
      React.useEffect(() => {
        // Other examples of synchronous updates in useEffect are imperative
        // event dispatches like `el.focus`, or `useSyncExternalStore`, which
        // may schedule a synchronous update upon subscribing if it detects
        // that the store has been mutated since the initial render.
        //
        // (Originally I wrote this test using `el.focus` but those errors
        // get dispatched in a JSDOM event and I don't know how to "catch" those
        // so that they don't fail the test.)
        ReactDOM.flushSync(() => {
          setStep(step + 1);
        });
      }, [step]);
      return step;
    }

    const container = document.createElement('div');
    const errors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError: (error, errorInfo) => {
        errors.push(
          `${error.message}${normalizeCodeLocInfo(errorInfo.componentStack)}`,
        );
      },
    });
    await act(() => {
      ReactDOM.flushSync(() => {
        root.render(<NonTerminating />);
      });
    });

    expect(errors).toEqual([
      'Maximum update depth exceeded. ' +
        'This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. ' +
        'React limits the number of nested updates to prevent infinite loops.' +
        '\n    in NonTerminating (at **)',
    ]);
  });

  it('warns instead of throwing when infinite Suspense ping loop is detected via enableInfiniteRenderLoopDetection during commit phase', async () => {
    if (
      !__DEV__ ||
      gate(
        flags =>
          !flags.enableInfiniteRenderLoopDetection ||
          flags.enableInfiniteRenderLoopDetectionForceThrow,
      )
    ) {
      return;
    }

    // When a Suspense child throws a thenable, React registers two listeners:
    // 1. ping (attachPingListener, render) → pingSuspendedRoot → markRootPinged
    // 2. retry (attachSuspenseRetryListeners, commit) → resolveRetryWakeable
    //
    // The ping path calls throwIfInfiniteUpdateLoopDetected(true) via
    // markRootPinged WITHOUT a prior getRootForUpdatedFiber(false) check.
    // When this fires during CommitContext (not RenderContext),
    // the isFromInfiniteRenderLoopDetectionInstrumentation=true parameter
    // ensures we warn instead of throw.
    //
    // Without the fix (passing false), the condition
    //   false || (executionContext & RenderContext && ...)
    // evaluates to false in CommitContext, causing a throw.
    let currentResolve = null;
    let shouldStop = false;

    function App() {
      const [, setState] = React.useState(0);

      React.useLayoutEffect(() => {
        if (shouldStop) {
          return;
        }
        // Resolve the suspended thenable during commit phase (CommitContext).
        // The ping callback (registered first during render) fires first,
        // triggering markRootPinged → throwIfInfiniteUpdateLoopDetected(true).
        if (currentResolve !== null) {
          const resolve = currentResolve;
          currentResolve = null;
          resolve();
        }
        // Schedule a sync update to ensure nestedUpdateKind is
        // NESTED_UPDATE_SYNC_LANE at commitRootImpl epilogue.
        setState(n => n + 1);
      });

      return (
        <React.Suspense fallback="loading">
          <SuspendingChild />
        </React.Suspense>
      );
    }

    function SuspendingChild() {
      if (shouldStop) {
        return null;
      }
      // Each render throws a new thenable. React calls .then() on it twice
      // (ping during render, retry during commit). We collect all callbacks
      // so resolve() fires them in registration order: ping first.
      const callbacks = [];
      const thenable = {
        then(onFulfilled) {
          callbacks.push(onFulfilled);
          currentResolve = () => {
            for (let i = 0; i < callbacks.length; i++) {
              callbacks[i]();
            }
          };
        },
      };

      throw thenable;
    }

    const container = document.createElement('div');
    const errors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError: error => {
        errors.push(error.message);
      },
    });

    const originalConsoleError = console.error;
    console.error = e => {
      if (
        typeof e === 'string' &&
        e.startsWith(
          'Maximum update depth exceeded. This could be an infinite loop.',
        )
      ) {
        // Stop the loop after the first warning so act() can finish.
        shouldStop = true;
      }
    };

    try {
      await act(() => {
        root.render(<App />);
      });
    } finally {
      console.error = originalConsoleError;
    }

    // With the fix (throwIfInfiniteUpdateLoopDetected(true) in markRootPinged):
    // the loop is discovered via enableInfiniteRenderLoopDetection instrumentation
    // and produces a warning.
    // Without the fix (throwIfInfiniteUpdateLoopDetected(false)):
    // the same check throws because executionContext is CommitContext, not
    // RenderContext.
    expect(shouldStop).toBe(true);
    expect(errors).toEqual([]);
  });

  // @gate enableInfiniteRenderLoopDetection && enableInfiniteRenderLoopDetectionForceThrow
  it('throws when sync render-phase update loop is detected with force-throw enabled', async () => {
    // Render-phase setState on another component's hook produces a sync
    // recursive update. With ForceThrow enabled this should throw via
    // throwForcedInfiniteRenderLoopError instead of only warning in DEV.
    let setState;
    let shouldStop = false;
    function App() {
      const [, _setState] = React.useState(0);
      setState = _setState;
      return <Child />;
    }

    function Child() {
      if (shouldStop) {
        return null;
      }
      setState(n => n + 1);
      return null;
    }

    const container = document.createElement('div');
    const errors = [];
    const captureError = error => {
      errors.push(error.message);
      // Stop scheduling new updates so the test (and the gate-off variant
      // where the legacy error path is recoverable) can terminate cleanly
      // without tripping the babel infinite-loop guard.
      shouldStop = true;
    };
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError: captureError,
      onRecoverableError: captureError,
      onCaughtError: captureError,
    });

    // The render-phase setState path also produces a dev-only "Cannot update
    // a component while rendering a different component" console.error on
    // every recursion. Swallow those so the test framework doesn't require
    // us to assert each one.
    const originalConsoleError = console.error;
    console.error = msg => {
      if (
        typeof msg === 'string' &&
        msg.startsWith('Cannot update a component')
      ) {
        return;
      }
      originalConsoleError(msg);
    };
    try {
      await act(() => {
        root.render(<App />);
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toContain(
      'Maximum update depth exceeded. This could be an infinite loop.',
    );
  });

  // @gate enableInfiniteRenderLoopDetection && enableInfiniteRenderLoopDetectionForceThrow
  it('throws when phase-spawn update loop is detected with force-throw enabled', async () => {
    // Wrapping the initial render in startTransition makes the render-phase
    // setState inherit a non-sync transition lane. After commit, the next
    // render is non-sync, so the loop detector classifies the recursion as
    // NESTED_UPDATE_PHASE_SPAWN (rather than SYNC_LANE). With ForceThrow
    // enabled, this branch should throw via throwForcedInfiniteRenderLoopError
    // instead of only warning in DEV.
    let setState;
    let shouldStop = false;
    // Hard cap on Child renders. Without enableInfiniteRenderLoopDetection,
    // the PHASE_SPAWN branch is gated off entirely, so no throw fires and
    // the loop would otherwise run until the babel infinite-loop guard.
    let renderCount = 0;
    const RENDER_CAP = 100;
    function App() {
      const [, _setState] = React.useState(0);
      setState = _setState;
      return <Child />;
    }

    function Child() {
      if (shouldStop || renderCount >= RENDER_CAP) {
        return null;
      }
      renderCount++;
      setState(n => n + 1);
      return null;
    }

    const container = document.createElement('div');
    const errors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError: error => {
        errors.push(error.message);
        shouldStop = true;
      },
    });

    const originalConsoleError = console.error;
    console.error = msg => {
      if (
        typeof msg === 'string' &&
        msg.startsWith('Cannot update a component')
      ) {
        return;
      }
      originalConsoleError(msg);
    };
    try {
      await act(() => {
        React.startTransition(() => root.render(<App />));
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toContain(
      'Maximum update depth exceeded. This could be an infinite loop.',
    );
  });

  it('prevents infinite update loop triggered by too many updates in ref callbacks', async () => {
    let scheduleUpdate;
    function TooManyRefUpdates() {
      const [count, _scheduleUpdate] = React.useReducer(c => c + 1, 0);
      scheduleUpdate = _scheduleUpdate;

      return (
        <div
          ref={() => {
            for (let i = 0; i < 50; i++) {
              scheduleUpdate(1);
            }
          }}>
          {count}
        </div>
      );
    }

    const container = document.createElement('div');
    const errors = [];
    const root = ReactDOMClient.createRoot(container, {
      onUncaughtError: (error, errorInfo) => {
        errors.push(
          `${error.message}${normalizeCodeLocInfo(errorInfo.componentStack)}`,
        );
      },
    });
    await act(() => {
      root.render(<TooManyRefUpdates />);
    });

    expect(errors).toEqual([
      'Maximum update depth exceeded. ' +
        'This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. ' +
        'React limits the number of nested updates to prevent infinite loops.' +
        '\n    in div' +
        '\n    in TooManyRefUpdates (at **)',
    ]);
  });
});
