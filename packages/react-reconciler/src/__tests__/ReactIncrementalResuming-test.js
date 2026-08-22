/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let assertLog;
let waitFor;
let waitForAll;
let startTransition;
let useState;
let useContext;
let Suspense;

describe('ReactIncrementalResuming', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    const InternalTestUtils = require('internal-test-utils');
    act = InternalTestUtils.act;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
    waitForAll = InternalTestUtils.waitForAll;
    startTransition = React.startTransition;
    useState = React.useState;
    useContext = React.useContext;
    Suspense = React.Suspense;
  });

  function span(prop) {
    return <span prop={prop} />;
  }

  // A transition that renders five memoized children, interrupted while the
  // third one is rendering. Each test interrupts it in a different way and
  // checks what has to render again when it continues. The first two children
  // finished; the third and its ancestors began but didn't complete.
  function createApp(options) {
    const Context = React.createContext(null);
    const childSetters = new Map();
    let setCounter;
    let setParentState;
    let setContextValue;
    let setAppState;

    const Child = React.memo(function Child({id, counter}) {
      const [localState, setLocalState] = useState(0);
      const contextValue = useContext(Context);
      childSetters.set(id, setLocalState);
      if (options.suspendsOn === id && counter === 1 && !options.resolved) {
        Scheduler.log('Suspend! [Child ' + id + ']');
        throw options.promise;
      }
      Scheduler.log('Child ' + id);
      return span(id + ':' + counter + ':' + localState + ':' + contextValue);
    });

    function Parent({counter}) {
      const [, _setParentState] = useState(0);
      setParentState = _setParentState;
      Scheduler.log('Parent');
      return [1, 2, 3, 4, 5].map(id => (
        <Child key={id} id={id} counter={counter} />
      ));
    }

    // Optionally between App and Parent. Only renders if the counter changed.
    class Wrapper extends React.Component {
      shouldComponentUpdate(nextProps) {
        return this.props.counter !== nextProps.counter;
      }
      render() {
        Scheduler.log('Wrapper');
        return <Parent counter={this.props.counter} />;
      }
    }

    function App() {
      const [counter, _setCounter] = useState(0);
      const [contextValue, _setContextValue] = useState('a');
      const [, _setAppState] = useState(0);
      setCounter = _setCounter;
      setContextValue = _setContextValue;
      setAppState = _setAppState;
      Scheduler.log('App');
      return (
        <Context.Provider value={contextValue}>
          <Suspense fallback={span('Loading...')}>
            {options.wrapParent ? (
              <Wrapper counter={counter} />
            ) : (
              <Parent counter={counter} />
            )}
          </Suspense>
        </Context.Provider>
      );
    }

    return {
      App,
      setCounter: value => setCounter(value),
      setParentState: value => setParentState(value),
      setContextValue: value => setContextValue(value),
      setAppState: value => setAppState(value),
      setChildState: (id, value) => childSetters.get(id)(value),
    };
  }

  const initialLog = [
    'App',
    'Parent',
    'Child 1',
    'Child 2',
    'Child 3',
    'Child 4',
    'Child 5',
  ];

  function output(counter, states, contextValue) {
    return (
      <>
        {[1, 2, 3, 4, 5].map(id =>
          span(
            id + ':' + counter + ':' + (states[id] || 0) + ':' + contextValue,
          ),
        )}
      </>
    );
  }

  // @gate enableResumingInterruptedRenders
  it('continues an interrupted transition from the finished work', async () => {
    const app = createApp({});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor(['App', 'Parent', 'Child 1', 'Child 2', 'Child 3']);

      // An update to Parent interrupts the transition. When the transition
      // continues, only Parent renders again: the children that already
      // rendered, finished or not, don't, and neither does anything above.
      ReactNoop.flushSync(() => app.setParentState(1));
      assertLog(['Parent']);
      expect(root).toMatchRenderedOutput(output(0, {}, 'a'));

      await waitForAll(['Parent', 'Child 4', 'Child 5']);
    });
    expect(root).toMatchRenderedOutput(output(1, {}, 'a'));

    // The work that was continued from has been committed. It's not
    // something a later render can continue from anymore.
    await act(() => startTransition(() => app.setCounter(2)));
    assertLog(initialLog);
    expect(root).toMatchRenderedOutput(output(2, {}, 'a'));
  });

  // @gate enableResumingInterruptedRenders
  it('continues past a class component whose shouldComponentUpdate is false', async () => {
    const app = createApp({wrapParent: true});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(['App', 'Wrapper', 'Parent', ...initialLog.slice(2)]);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor([
        'App',
        'Wrapper',
        'Parent',
        'Child 1',
        'Child 2',
        'Child 3',
      ]);

      // An update to App interrupts the transition. Wrapper's props are the
      // same as the committed ones, so it bails out.
      ReactNoop.flushSync(() => app.setAppState(1));
      assertLog(['App']);

      // When the transition continues, App renders again and gives Wrapper a
      // new props object. Wrapper compares it to the props it rendered with
      // during the transition, not the committed ones, so it bails out again
      // and everything below it is continued from.
      await waitForAll(['App', 'Child 4', 'Child 5']);
    });
    expect(root).toMatchRenderedOutput(output(1, {}, 'a'));
  });

  // @gate enableResumingInterruptedRenders
  it('does not continue from a child that updated in the meantime', async () => {
    const app = createApp({});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor(['App', 'Parent', 'Child 1', 'Child 2', 'Child 3']);

      ReactNoop.flushSync(() => app.setChildState(2, 1));
      assertLog(['Child 2']);
      expect(root).toMatchRenderedOutput(output(0, {2: 1}, 'a'));

      // Child 2 finished before the update, so its finished work is stale.
      await waitForAll(['Child 2', 'Child 4', 'Child 5']);
    });
    expect(root).toMatchRenderedOutput(output(1, {2: 1}, 'a'));
  });

  it('does not continue from a child that updated in the same transition', async () => {
    const app = createApp({});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor(['App', 'Parent', 'Child 1', 'Child 2', 'Child 3']);

      // This update is part of the same transition. The render in progress
      // finishes without it and commits, then the update renders on its own.
      startTransition(() => app.setChildState(1, 1));

      await waitForAll(['Child 4', 'Child 5', 'Child 1']);
    });
    expect(root).toMatchRenderedOutput(output(1, {1: 1}, 'a'));
  });

  it('does not continue from children whose context changed', async () => {
    const app = createApp({});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor(['App', 'Parent', 'Child 1', 'Child 2', 'Child 3']);

      ReactNoop.flushSync(() => app.setContextValue('b'));
      assertLog([
        'App',
        'Parent',
        'Child 1',
        'Child 2',
        'Child 3',
        'Child 4',
        'Child 5',
      ]);
      expect(root).toMatchRenderedOutput(output(0, {}, 'b'));

      // The finished children read the old context value.
      await waitForAll([
        'App',
        'Parent',
        'Child 1',
        'Child 2',
        'Child 3',
        'Child 4',
        'Child 5',
      ]);
    });
    expect(root).toMatchRenderedOutput(output(1, {}, 'b'));
  });

  it('does not continue from work that was rendered for other lanes', async () => {
    const app = createApp({});
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(async () => {
      startTransition(() => app.setCounter(1));
      await waitFor(['App', 'Parent', 'Child 1', 'Child 2', 'Child 3']);

      // A synchronous update to the same state. It must not pick up the
      // transition's finished children, which rendered the transition's value.
      ReactNoop.flushSync(() => app.setCounter(2));
      assertLog([
        'App',
        'Parent',
        'Child 1',
        'Child 2',
        'Child 3',
        'Child 4',
        'Child 5',
      ]);
      expect(root).toMatchRenderedOutput(output(2, {}, 'a'));

      // The transition's update was rebased below the synchronous one, so it
      // produces the same state and App bails out.
      await waitForAll(['App']);
    });
    expect(root).toMatchRenderedOutput(output(2, {}, 'a'));
  });

  // @gate enableResumingInterruptedRenders
  it('continues past an updated leaf without re-rendering its ancestors', async () => {
    // A tree of memoized components with stateful leaves, like a grid of
    // hoverable items. A transition re-renders all of it; meanwhile leaves
    // update synchronously. Each update has to be folded into the transition,
    // but without re-rendering the path of ancestors above it, or continuous
    // input could starve the transition.
    const setHovers = [];
    function Dot({text}) {
      const [hover, setHover] = useState(false);
      setHovers.push(setHover);
      Scheduler.log('Dot' + (hover ? '*' : ''));
      return span(hover ? '*' + text + '*' : text);
    }
    // Named differently from the memoized component so that the children
    // below are the memoized one, not the plain function.
    const Tri = React.memo(function Triangle({depth, children}) {
      Scheduler.log('Tri' + depth);
      if (depth === 0) {
        return <Dot text={children} />;
      }
      return (
        <>
          <Tri depth={depth - 1}>{children}</Tri>
          <Tri depth={depth - 1}>{children}</Tri>
        </>
      );
    });
    let setSeconds;
    function App() {
      const [seconds, _setSeconds] = useState(0);
      setSeconds = _setSeconds;
      Scheduler.log('App');
      return <Tri depth={2}>{seconds}</Tri>;
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog([
      'App',
      'Tri2',
      'Tri1',
      'Tri0',
      'Dot',
      'Tri0',
      'Dot',
      'Tri1',
      'Tri0',
      'Dot',
      'Tri0',
      'Dot',
    ]);

    await act(async () => {
      startTransition(() => setSeconds(1));
      await waitFor(['App', 'Tri2', 'Tri1', 'Tri0', 'Dot', 'Tri0', 'Dot']);

      // Hover the first leaf, whose subtree the transition already finished.
      ReactNoop.flushSync(() => setHovers[0](true));
      assertLog(['Dot*']);

      // The transition continues where it left off. The first leaf renders
      // again with its new state; nothing above it does, whether it had
      // finished or not.
      await waitFor(['Dot*', 'Tri1', 'Tri0', 'Dot']);

      // Hover the leaf the transition is in the middle of rendering.
      ReactNoop.flushSync(() => setHovers[2](true));
      assertLog(['Dot*']);

      await waitForAll(['Dot*', 'Tri0', 'Dot']);
    });
    expect(root).toMatchRenderedOutput(
      <>
        {span('*1*')}
        {span(1)}
        {span('*1*')}
        {span(1)}
      </>,
    );
  });

  // @gate enableResumingInterruptedRenders
  it('continues from children that were mounted', async () => {
    const Item = React.memo(function Item({id}) {
      Scheduler.log('Item ' + id);
      return span(id);
    });
    function List({show}) {
      Scheduler.log('List');
      return show ? [1, 2, 3].map(id => <Item key={id} id={id} />) : null;
    }
    function Sibling() {
      Scheduler.log('Sibling');
      return span('sibling');
    }
    let setShow;
    let setOther;
    function App() {
      const [show, _setShow] = useState(false);
      const [, _setOther] = useState(0);
      setShow = _setShow;
      setOther = _setOther;
      Scheduler.log('App');
      return (
        <>
          <List show={show} />
          <Sibling />
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['App', 'List', 'Sibling']);

    await act(async () => {
      // Mount the items in a transition, and stop once the second one has
      // rendered, before it completed.
      startTransition(() => setShow(true));
      await waitFor(['App', 'List', 'Item 1', 'Item 2']);

      // An update to App interrupts the transition.
      ReactNoop.flushSync(() => setOther(1));
      assertLog(['App', 'List', 'Sibling']);

      // The transition continues. App and List render again, since App was
      // updated, but the first two items already rendered and their props
      // haven't changed, so they're continued from.
      await waitForAll(['App', 'List', 'Item 3', 'Sibling']);
    });
    expect(root).toMatchRenderedOutput(
      <>
        {span(1)}
        {span(2)}
        {span(3)}
        {span('sibling')}
      </>,
    );
  });

  // @gate enableResumingInterruptedRenders
  it('deletes what is committed when a deleted child updated in the meantime', async () => {
    let setExtra;
    function C() {
      const [extra, _setExtra] = useState(true);
      setExtra = _setExtra;
      Scheduler.log('C ' + extra);
      return (
        <>
          {span('c')}
          {extra ? span('c-extra') : null}
        </>
      );
    }
    function A() {
      Scheduler.log('A');
      return span('a');
    }
    function Q() {
      Scheduler.log('Q');
      return span('q');
    }
    function P({counter}) {
      Scheduler.log('P');
      return counter === 0 ? [<A key="a" />, <C key="c" />] : [<A key="a" />];
    }

    const root = ReactNoop.createRoot();
    await act(() =>
      root.render(
        <>
          <P counter={0} />
          <Q />
        </>,
      ),
    );
    assertLog(['P', 'A', 'C true', 'Q']);

    await act(async () => {
      startTransition(() =>
        root.render(
          <>
            <P counter={1} />
            <Q />
          </>,
        ),
      );
      // P finished, with C's deletion recorded on it.
      await waitFor(['P', 'A', 'Q']);

      // C updates and commits a new version of itself before the deletion
      // commits.
      ReactNoop.flushSync(() => setExtra(false));
      assertLog(['C false']);
      expect(root).toMatchRenderedOutput(
        <>
          {span('a')}
          {span('c')}
          {span('q')}
        </>,
      );

      // P is taken as finished, and Q continues from where it was. The
      // deletion has to remove the version of C that's committed now.
      await waitForAll([]);
    });
    expect(root).toMatchRenderedOutput(
      <>
        {span('a')}
        {span('q')}
      </>,
    );
  });

  // @gate enableResumingInterruptedRenders
  it('commits a kept class version with its instance at that version', async () => {
    let setExtra;
    let setAppState;
    let resolveGate;
    let gateResolved = false;
    const gatePromise = new Promise(resolve => {
      resolveGate = () => {
        gateResolved = true;
        resolve();
      };
    });
    let resolveQ;
    let qResolved = false;
    const qPromise = new Promise(resolve => {
      resolveQ = () => {
        qResolved = true;
        resolve();
      };
    });
    class C extends React.Component {
      componentDidUpdate() {
        Scheduler.log(
          'C didUpdate ' + this.props.counter + ':' + this.props.extra,
        );
      }
      render() {
        Scheduler.log('C ' + this.props.counter + ':' + this.props.extra);
        return span('c:' + this.props.counter + ':' + this.props.extra);
      }
    }
    function Gate({extra}) {
      if (extra === 1 && !gateResolved) {
        Scheduler.log('Suspend! [Gate]');
        throw gatePromise;
      }
      Scheduler.log('Gate');
      return null;
    }
    function P({counter}) {
      const [extra, _setExtra] = useState(0);
      setExtra = _setExtra;
      Scheduler.log('P');
      return (
        <>
          <C counter={counter} extra={extra} />
          <Gate extra={extra} />
        </>
      );
    }
    const M = React.memo(function M({counter}) {
      Scheduler.log('M');
      return <P counter={counter} />;
    });
    function Q({counter}) {
      if (counter === 1 && !qResolved) {
        Scheduler.log('Suspend! [Q]');
        throw qPromise;
      }
      Scheduler.log('Q');
      return span('q');
    }
    let setCounter;
    function App() {
      const [counter, _setCounter] = useState(0);
      const [, _setAppState] = useState(0);
      setCounter = _setCounter;
      setAppState = _setAppState;
      Scheduler.log('App');
      return (
        <>
          <M counter={counter} />
          <Suspense fallback={span('Loading...')}>
            <Q counter={counter} />
          </Suspense>
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['App', 'M', 'P', 'C 0:0', 'Gate', 'Q']);

    await act(async () => {
      // The transition finishes M's subtree, then suspends on Q and waits.
      startTransition(() => setCounter(1));
      await waitForAll(['App', 'M', 'P', 'C 1:0', 'Gate', 'Suspend! [Q]']);

      // A sync update in P renders C with other props, then suspends with no
      // boundary, so nothing from it commits.
      ReactNoop.flushSync(() => setExtra(1));
      assertLog(['P', 'C 0:1', 'Suspend! [Gate]']);

      // The transition renders P again because of the update and suspends on
      // Q again. The sync update is retried too, and renders C with its props
      // again before suspending again. Nothing commits.
      startTransition(() => setAppState(1));
      await waitForAll([
        'App',
        'P',
        'C 1:0',
        'Gate',
        'Suspend! [Q]',
        'App',
        'Q',
        'P',
        'C 0:1',
        'Suspend! [Gate]',
        'App',
        'Suspend! [Q]',
        'P',
        'C 0:1',
        'Suspend! [Gate]',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          {span('c:0:0')}
          {span('q')}
        </>,
      );
    });

    // The transition continues. M bails out and keeps the subtree it
    // finished, so C commits as the version that rendered earlier, and the
    // instance has to be at that version's props again.
    await act(() => resolveQ());
    assertLog([
      'App',
      'Q',
      'C didUpdate 1:0',
      // The sync update is retried on top of it.
      'P',
      'C 1:1',
      'Suspend! [Gate]',
    ]);
    expect(root).toMatchRenderedOutput(
      <>
        {span('c:1:0')}
        {span('q')}
      </>,
    );

    await act(() => resolveGate());
    assertLog(['P', 'C 1:1', 'Gate', 'C didUpdate 1:1']);
    expect(root).toMatchRenderedOutput(
      <>
        {span('c:1:1')}
        {span('q')}
      </>,
    );
  });

  it('does not continue from a mount that read a context that changed', async () => {
    const Ctx = React.createContext('a');
    function Cell() {
      const value = useContext(Ctx);
      Scheduler.log('Cell ' + value);
      return span('cell:' + value);
    }
    const Row = React.memo(function Row() {
      Scheduler.log('Row');
      return <Cell />;
    });
    function Other() {
      Scheduler.log('Other');
      return span('other');
    }
    function List({show}) {
      Scheduler.log('List');
      return show ? (
        <>
          <Row />
          <Other />
        </>
      ) : null;
    }
    let setShow;
    let setCtx;
    function App() {
      const [show, _setShow] = useState(false);
      const [ctx, _setCtx] = useState('a');
      setShow = _setShow;
      setCtx = _setCtx;
      Scheduler.log('App');
      return (
        <Ctx.Provider value={ctx}>
          <List show={show} />
        </Ctx.Provider>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => root.render(<App />));
    assertLog(['App', 'List']);

    await act(async () => {
      // Mount Row, whose Cell reads the context, then stop.
      startTransition(() => setShow(true));
      await waitFor(['App', 'List', 'Row', 'Cell a']);

      // The context changes and commits. Nothing in the committed tree reads
      // it, so nothing gets marked; the mounted Row does read it.
      ReactNoop.flushSync(() => setCtx('b'));
      assertLog(['App', 'List']);

      await waitForAll(['App', 'List', 'Row', 'Cell b', 'Other']);
    });
    expect(root).toMatchRenderedOutput(
      <>
        {span('cell:b')}
        {span('other')}
      </>,
    );
  });

  // @gate enableResumingInterruptedRenders
  it('does not continue from work that suspended', async () => {
    let resolvePromise;
    const options = {
      suspendsOn: 4,
      resolved: false,
      promise: new Promise(resolve => {
        resolvePromise = resolve;
      }),
    };
    const app = createApp(options);
    const root = ReactNoop.createRoot();
    await act(() => root.render(<app.App />));
    assertLog(initialLog);

    await act(() => startTransition(() => app.setCounter(1)));
    assertLog([
      'App',
      'Parent',
      'Child 1',
      'Child 2',
      'Child 3',
      'Suspend! [Child 4]',
      'Child 5',
    ]);
    // The transition doesn't show the fallback; it waits.
    expect(root).toMatchRenderedOutput(output(0, {}, 'a'));

    // The children that finished are still good, whether before or after the
    // one that suspended. What's above it isn't: that's shaped by what caught
    // the promise.
    await act(() => {
      options.resolved = true;
      resolvePromise();
    });
    assertLog(['App', 'Parent', 'Child 4']);
    expect(root).toMatchRenderedOutput(output(1, {}, 'a'));
  });
});
