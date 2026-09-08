let React;
let ReactNoop;
let Scheduler;
let act;
let LegacyHidden;
let Activity;
let useState;
let useLayoutEffect;
let useEffect;
let useInsertionEffect;
let useMemo;
let startTransition;
let waitForPaint;
let waitFor;
let assertLog;
let assertConsoleErrorDev;
let Suspense;

describe('Activity', () => {
  beforeEach(() => {
    jest.resetModules();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    LegacyHidden = React.unstable_LegacyHidden;
    Activity = React.Activity;
    Suspense = React.Suspense;
    useState = React.useState;
    useInsertionEffect = React.useInsertionEffect;
    useLayoutEffect = React.useLayoutEffect;
    useEffect = React.useEffect;
    useMemo = React.useMemo;
    startTransition = React.startTransition;

    const InternalTestUtils = require('internal-test-utils');
    waitForPaint = InternalTestUtils.waitForPaint;
    waitFor = InternalTestUtils.waitFor;
    assertLog = InternalTestUtils.assertLog;
    assertConsoleErrorDev = InternalTestUtils.assertConsoleErrorDev;
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span prop={props.text}>{props.children}</span>;
  }

  // @gate enableLegacyHidden
  it('unstable-defer-without-hiding should never toggle the visibility of its children', async () => {
    function App({mode}) {
      return (
        <>
          <Text text="Normal" />
          <LegacyHidden mode={mode}>
            <Text text="Deferred" />
          </LegacyHidden>
        </>
      );
    }

    // Test the initial mount
    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(<App mode="unstable-defer-without-hiding" />);
      await waitForPaint(['Normal']);
      expect(root).toMatchRenderedOutput(<span prop="Normal" />);
    });
    assertLog(['Deferred']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Normal" />
        <span prop="Deferred" />
      </>,
    );

    // Now try after an update
    await act(() => {
      root.render(<App mode="visible" />);
    });
    assertLog(['Normal', 'Deferred']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Normal" />
        <span prop="Deferred" />
      </>,
    );

    await act(async () => {
      root.render(<App mode="unstable-defer-without-hiding" />);
      await waitForPaint(['Normal']);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Normal" />
          <span prop="Deferred" />
        </>,
      );
    });
    assertLog(['Deferred']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Normal" />
        <span prop="Deferred" />
      </>,
    );
  });

  // @gate enableLegacyHidden && !disableLegacyMode
  it('does not defer in legacy mode', async () => {
    let setState;
    function Foo() {
      const [state, _setState] = useState('A');
      setState = _setState;
      return <Text text={state} />;
    }

    const root = ReactNoop.createLegacyRoot();
    await act(() => {
      root.render(
        <>
          <LegacyHidden mode="hidden">
            <Foo />
          </LegacyHidden>
          <Text text="Outside" />
        </>,
      );

      ReactNoop.flushSync();

      // Should not defer the hidden tree
      assertLog(['A', 'Outside']);
    });
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Outside" />
      </>,
    );

    // Test that the children can be updated
    await act(() => {
      setState('B');
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="B" />
        <span prop="Outside" />
      </>,
    );
  });

  // @gate enableLegacyHidden
  it('does defer in concurrent mode', async () => {
    let setState;
    function Foo() {
      const [state, _setState] = useState('A');
      setState = _setState;
      return <Text text={state} />;
    }

    const root = ReactNoop.createRoot();
    await act(async () => {
      root.render(
        <>
          <LegacyHidden mode="hidden">
            <Foo />
          </LegacyHidden>
          <Text text="Outside" />
        </>,
      );
      // Should defer the hidden tree.
      await waitForPaint(['Outside']);
    });

    // The hidden tree was rendered at lower priority.
    assertLog(['A']);

    expect(root).toMatchRenderedOutput(
      <>
        <span prop="A" />
        <span prop="Outside" />
      </>,
    );

    // Test that the children can be updated
    await act(() => {
      setState('B');
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="B" />
        <span prop="Outside" />
      </>,
    );
  });

  it('mounts without layout effects when hidden', async () => {
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const root = ReactNoop.createRoot();

    // Mount hidden tree.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    // No layout effect.
    assertLog(['Child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="Child" />);

    // Unhide the tree. The layout effect is mounted.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);
  });

  it('mounts/unmounts layout effects when visibility changes (starting visible)', async () => {
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);

    // Hide the tree. The layout effect is unmounted.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Unmount layout', 'Child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="Child" />);

    // Unhide the tree. The layout effect is re-mounted.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);
  });

  it('nested offscreen does not call componentWillUnmount when hidden', async () => {
    // This is a bug that appeared during production test of <Activity />.
    // It is a very specific scenario with nested Offscreens. The inner offscreen
    // goes from visible to hidden in synchronous update.
    class ClassComponent extends React.Component {
      render() {
        return <Text text="child" />;
      }

      componentWillUnmount() {
        Scheduler.log('componentWillUnmount');
      }

      componentDidMount() {
        Scheduler.log('componentDidMount');
      }
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      // Outer and inner offscreen are hidden.
      root.render(
        <Activity mode={'hidden'}>
          <Activity mode={'hidden'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    assertLog(['child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="child" />);

    await act(() => {
      // Inner offscreen is visible.
      root.render(
        <Activity mode={'hidden'}>
          <Activity mode={'visible'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    assertLog(['child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="child" />);

    await act(() => {
      // Inner offscreen is hidden.
      root.render(
        <Activity mode={'hidden'}>
          <Activity mode={'hidden'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    assertLog(['child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="child" />);

    await act(() => {
      // Inner offscreen is visible.
      root.render(
        <Activity mode={'hidden'}>
          <Activity mode={'visible'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    Scheduler.unstable_clearLog();

    await act(() => {
      // Outer offscreen is visible.
      // Inner offscreen is hidden.
      root.render(
        <Activity mode={'visible'}>
          <Activity mode={'hidden'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    assertLog(['child']);

    await act(() => {
      // Outer offscreen is hidden.
      // Inner offscreen is visible.
      root.render(
        <Activity mode={'hidden'}>
          <Activity mode={'visible'}>
            <ClassComponent />
          </Activity>
        </Activity>,
      );
    });

    assertLog(['child']);
  });

  it('mounts/unmounts layout effects when visibility changes (starting hidden)', async () => {
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      // Start the tree hidden. The layout effect is not mounted.
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="Child" />);

    // Show the tree. The layout effect is mounted.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);

    // Hide the tree again. The layout effect is un-mounted.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Unmount layout', 'Child']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="Child" />);
  });

  it('hides children of offscreen after layout effects are destroyed', async () => {
    const root = ReactNoop.createRoot();
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          // The child should not be hidden yet.
          expect(root).toMatchRenderedOutput(<span prop="Child" />);
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Child', 'Mount layout']);
    expect(root).toMatchRenderedOutput(<span prop="Child" />);

    // Hide the tree. The layout effect is unmounted.
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['Unmount layout', 'Child']);

    // After the layout effect is unmounted, the child is hidden.
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="Child" />);
  });

  // @gate enableLegacyHidden
  it('does not toggle effects for LegacyHidden component', async () => {
    // LegacyHidden is meant to be the same as offscreen except it doesn't
    // do anything to effects. Only used by www, as a temporary migration step.
    function Child({text}) {
      useLayoutEffect(() => {
        Scheduler.log('Mount layout');
        return () => {
          Scheduler.log('Unmount layout');
        };
      }, []);
      return <Text text="Child" />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <LegacyHidden mode="visible">
          <Child />
        </LegacyHidden>,
      );
    });
    assertLog(['Child', 'Mount layout']);

    await act(() => {
      root.render(
        <LegacyHidden mode="hidden">
          <Child />
        </LegacyHidden>,
      );
    });
    assertLog(['Child']);

    await act(() => {
      root.render(
        <LegacyHidden mode="visible">
          <Child />
        </LegacyHidden>,
      );
    });
    assertLog(['Child']);

    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount layout']);
  });

  it('hides new insertions into an already hidden tree', async () => {
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <span>Hi</span>
        </Activity>,
      );
    });
    expect(root).toMatchRenderedOutput(<span hidden={true}>Hi</span>);

    // Insert a new node into the hidden tree
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <span>Hi</span>
          <span>Something new</span>
        </Activity>,
      );
    });
    expect(root).toMatchRenderedOutput(
      <>
        <span hidden={true}>Hi</span>
        {/* This new node should also be hidden */}
        <span hidden={true}>Something new</span>
      </>,
    );
  });

  it('hides updated nodes inside an already hidden tree', async () => {
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <span>Hi</span>
        </Activity>,
      );
    });
    expect(root).toMatchRenderedOutput(<span hidden={true}>Hi</span>);

    // Set the `hidden` prop to on an already hidden node
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <span hidden={false}>Hi</span>
        </Activity>,
      );
    });
    // It should still be hidden, because the Activity container overrides it
    expect(root).toMatchRenderedOutput(<span hidden={true}>Hi</span>);

    // Unhide the boundary
    await act(() => {
      root.render(
        <Activity mode="visible">
          <span hidden={true}>Hi</span>
        </Activity>,
      );
    });
    // It should still be hidden, because of the prop
    expect(root).toMatchRenderedOutput(<span hidden={true}>Hi</span>);

    // Remove the `hidden` prop
    await act(() => {
      root.render(
        <Activity mode="visible">
          <span>Hi</span>
        </Activity>,
      );
    });
    // Now it's visible
    expect(root).toMatchRenderedOutput(<span>Hi</span>);
  });

  it('revealing a hidden tree at high priority does not cause tearing', async () => {
    // When revealing an offscreen tree, we need to include updates that were
    // previously deferred because the tree was hidden, even if they are lower
    // priority than the current render. However, we should *not* include low
    // priority updates that are entangled with updates outside of the hidden
    // tree, because that can cause tearing.
    //
    // This test covers a scenario where an update multiple updates inside a
    // hidden tree share the same lane, but are processed at different times
    // because of the timing of when they were scheduled.

    // This functions checks whether the "outer" and "inner" states are
    // consistent in the rendered output.
    let currentOuter = null;
    let currentInner = null;
    function areOuterAndInnerConsistent() {
      return (
        currentOuter === null ||
        currentInner === null ||
        currentOuter === currentInner
      );
    }

    let setInner;
    function Child() {
      const [inner, _setInner] = useState(0);
      setInner = _setInner;

      useEffect(() => {
        currentInner = inner;
        return () => {
          currentInner = null;
        };
      }, [inner]);

      return <Text text={'Inner: ' + inner} />;
    }

    let setOuter;
    function App({show}) {
      const [outer, _setOuter] = useState(0);
      setOuter = _setOuter;

      useEffect(() => {
        currentOuter = outer;
        return () => {
          currentOuter = null;
        };
      }, [outer]);

      return (
        <>
          <Text text={'Outer: ' + outer} />
          <Activity mode={show ? 'visible' : 'hidden'}>
            <Child />
          </Activity>
        </>
      );
    }

    // Render a hidden tree
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App show={false} />);
    });
    assertLog(['Outer: 0', 'Inner: 0']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Outer: 0" />
        <span hidden={true} prop="Inner: 0" />
      </>,
    );
    expect(areOuterAndInnerConsistent()).toBe(true);

    await act(async () => {
      // Update a value both inside and outside the hidden tree. These values
      // must always be consistent.
      setOuter(1);
      setInner(1);
      // Only the outer updates finishes because the inner update is inside a
      // hidden tree. The outer update is deferred to a later render.
      await waitForPaint(['Outer: 1']);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer: 1" />
          <span hidden={true} prop="Inner: 0" />
        </>,
      );

      // Before the inner update can finish, we receive another pair of updates.
      React.startTransition(() => {
        setOuter(2);
        setInner(2);
      });

      // Also, before either of these new updates are processed, the hidden
      // tree is revealed at high priority.
      ReactNoop.flushSync(() => {
        root.render(<App show={true} />);
      });

      assertLog([
        'Outer: 1',

        // There are two pending updates on Inner, but only the first one
        // is processed, even though they share the same lane. If the second
        // update were erroneously processed, then Inner would be inconsistent
        // with Outer.
        'Inner: 1',
      ]);
      expect(root).toMatchRenderedOutput(
        <>
          <span prop="Outer: 1" />
          <span prop="Inner: 1" />
        </>,
      );
      expect(areOuterAndInnerConsistent()).toBe(true);
    });
    assertLog(['Outer: 2', 'Inner: 2']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Outer: 2" />
        <span prop="Inner: 2" />
      </>,
    );
    expect(areOuterAndInnerConsistent()).toBe(true);
  });

  it('regression: Activity instance is sometimes null during setState', async () => {
    let setState;
    function Child() {
      const [state, _setState] = useState('Initial');
      setState = _setState;
      return <Text text={state} />;
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<Activity />);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(null);

    await act(async () => {
      // Partially render a component
      startTransition(() => {
        root.render(
          <Activity>
            <Child />
            <Text text="Sibling" />
          </Activity>,
        );
      });
      await waitFor(['Initial']);

      // Before it finishes rendering, the whole tree gets deleted
      ReactNoop.flushSync(() => {
        root.render(null);
      });

      // Something attempts to update the never-mounted component. When this
      // regression test was written, we would walk up the component's return
      // path and reach an unmounted Activity component fiber. Its `stateNode`
      // would be null because it was nulled out when it was deleted, but there
      // was no null check before we accessed it. A weird edge case but we must
      // account for it.
      setState('Updated');
      assertConsoleErrorDev([
        "Can't perform a React state update on a component that hasn't mounted yet. " +
          'This indicates that you have a side-effect in your render function that ' +
          'asynchronously tries to update the component. ' +
          'Move this work to useEffect instead.\n' +
          '    in Child (at **)',
      ]);
    });
    expect(root).toMatchRenderedOutput(null);
  });

  it('class component setState callbacks do not fire until tree is visible', async () => {
    const root = ReactNoop.createRoot();

    let child;
    class Child extends React.Component {
      state = {text: 'A'};
      render() {
        child = this;
        return <Text text={this.state.text} />;
      }
    }

    // Initial render
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['A']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="A" />);

    // Schedule an update to a hidden class component. The update will finish
    // rendering in the background, but the callback shouldn't fire yet, because
    // the component isn't visible.
    await act(() => {
      child.setState({text: 'B'}, () => {
        Scheduler.log('B update finished');
      });
    });
    assertLog(['B']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop="B" />);

    // Now reveal the hidden component. Simultaneously, schedule another
    // update with a callback to the same component. When the component is
    // revealed, both the B callback and C callback should fire, in that order.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
      child.setState({text: 'C'}, () => {
        Scheduler.log('C update finished');
      });
    });
    assertLog(['C', 'B update finished', 'C update finished']);
    expect(root).toMatchRenderedOutput(<span prop="C" />);
  });

  it('does not call componentDidUpdate when reappearing a hidden class component', async () => {
    class Child extends React.Component {
      componentDidMount() {
        Scheduler.log('componentDidMount');
      }
      componentDidUpdate() {
        Scheduler.log('componentDidUpdate');
      }
      componentWillUnmount() {
        Scheduler.log('componentWillUnmount');
      }
      render() {
        return 'Child';
      }
    }

    // Initial mount
    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['componentDidMount']);

    // Hide the class component
    await act(() => {
      root.render(
        <Activity mode="hidden">
          <Child />
        </Activity>,
      );
    });
    assertLog(['componentWillUnmount']);

    // Reappear the class component. componentDidMount should fire, not
    // componentDidUpdate.
    await act(() => {
      root.render(
        <Activity mode="visible">
          <Child />
        </Activity>,
      );
    });
    assertLog(['componentDidMount']);
  });

  it(
    'when reusing old components (hidden -> visible), layout effects fire ' +
      'with same timing as if it were brand new',
    async () => {
      function Child({label}) {
        useLayoutEffect(() => {
          Scheduler.log('Mount ' + label);
          return () => {
            Scheduler.log('Unmount ' + label);
          };
        }, [label]);
        return label;
      }

      // Initial mount
      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(
          <Activity mode="visible">
            <Child key="B" label="B" />
          </Activity>,
        );
      });
      assertLog(['Mount B']);

      // Hide the component
      await act(() => {
        root.render(
          <Activity mode="hidden">
            <Child key="B" label="B" />
          </Activity>,
        );
      });
      assertLog(['Unmount B']);

      // Reappear the component and also add some new siblings.
      await act(() => {
        root.render(
          <Activity mode="visible">
            <Child key="A" label="A" />
            <Child key="B" label="B" />
            <Child key="C" label="C" />
          </Activity>,
        );
      });
      // B's effect should fire in between A and C even though it's been reused
      // from a previous render. In other words, it's the same order as if all
      // three siblings were brand new.
      assertLog(['Mount A', 'Mount B', 'Mount C']);
    },
  );

  it(
    'when reusing old components (hidden -> visible), layout effects fire ' +
      'with same timing as if it were brand new (includes setState callback)',
    async () => {
      class Child extends React.Component {
        componentDidMount() {
          Scheduler.log('Mount ' + this.props.label);
        }
        componentWillUnmount() {
          Scheduler.log('Unmount ' + this.props.label);
        }
        render() {
          return this.props.label;
        }
      }

      // Initial mount
      const bRef = React.createRef();
      const root = ReactNoop.createRoot();
      await act(() => {
        root.render(
          <Activity mode="visible">
            <Child key="B" ref={bRef} label="B" />
          </Activity>,
        );
      });
      assertLog(['Mount B']);

      // We're going to schedule an update on a hidden component, so stash a
      // reference to its setState before the ref gets detached
      const setStateB = bRef.current.setState.bind(bRef.current);

      // Hide the component
      await act(() => {
        root.render(
          <Activity mode="hidden">
            <Child key="B" ref={bRef} label="B" />
          </Activity>,
        );
      });
      assertLog(['Unmount B']);

      // Reappear the component and also add some new siblings.
      await act(() => {
        setStateB(null, () => {
          Scheduler.log('setState callback B');
        });
        root.render(
          <Activity mode="visible">
            <Child key="A" label="A" />
            <Child key="B" ref={bRef} label="B" />
            <Child key="C" label="C" />
          </Activity>,
        );
      });
      // B's effect should fire in between A and C even though it's been reused
      // from a previous render. In other words, it's the same order as if all
      // three siblings were brand new.
      assertLog(['Mount A', 'Mount B', 'setState callback B', 'Mount C']);
    },
  );

  it('defer passive effects when prerendering a new Activity tree', async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return <Text text={label} />;
    }

    function App({showMore}) {
      return (
        <>
          <Child label="Shell" />
          <Activity mode={showMore ? 'visible' : 'hidden'}>
            <Child label="More" />
          </Activity>
        </>
      );
    }

    const root = ReactNoop.createRoot();

    // Mount the app without showing the extra content
    await act(() => {
      root.render(<App showMore={false} />);
    });
    assertLog([
      // First mount the outer visible shell
      'Shell',
      'Mount Shell',

      // Then prerender the hidden extra context. The passive effects in the
      // hidden tree should not fire
      'More',
      // Does not fire
      // 'Mount More',
    ]);
    // The hidden content has been prerendered
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Shell" />
        <span hidden={true} prop="More" />
      </>,
    );

    // Reveal the prerendered tree
    await act(() => {
      root.render(<App showMore={true} />);
    });
    assertLog([
      'Shell',
      'More',

      // Mount the passive effects in the newly revealed tree, the ones that
      // were skipped during pre-rendering.
      'Mount More',
    ]);
  });

  // @gate enableLegacyHidden
  it('do not defer passive effects when prerendering a new LegacyHidden tree', async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return <Text text={label} />;
    }

    function App({showMore}) {
      return (
        <>
          <Child label="Shell" />
          <LegacyHidden
            mode={showMore ? 'visible' : 'unstable-defer-without-hiding'}>
            <Child label="More" />
          </LegacyHidden>
        </>
      );
    }

    const root = ReactNoop.createRoot();

    // Mount the app without showing the extra content
    await act(() => {
      root.render(<App showMore={false} />);
    });
    assertLog([
      // First mount the outer visible shell
      'Shell',
      'Mount Shell',

      // Then prerender the hidden extra context. Unlike Activity, the passive
      // effects in the hidden tree *should* fire
      'More',
      'Mount More',
    ]);

    // The hidden content has been prerendered
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Shell" />
        <span prop="More" />
      </>,
    );

    // Reveal the prerendered tree
    await act(() => {
      root.render(<App showMore={true} />);
    });
    assertLog(['Shell', 'More']);
  });

  it('passive effects are connected and disconnected when the visibility changes', async () => {
    function Child({step}) {
      useEffect(() => {
        Scheduler.log(`Commit mount [${step}]`);
        return () => {
          Scheduler.log(`Commit unmount [${step}]`);
        };
      }, [step]);
      return <Text text={step} />;
    }

    function App({show, step}) {
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          {useMemo(
            () => (
              <Child step={step} />
            ),
            [step],
          )}
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App show={true} step={1} />);
    });
    assertLog([1, 'Commit mount [1]']);
    expect(root).toMatchRenderedOutput(<span prop={1} />);

    // Hide the tree. This will unmount the effect.
    await act(() => {
      root.render(<App show={false} step={1} />);
    });
    assertLog(['Commit unmount [1]']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop={1} />);

    // Update.
    await act(() => {
      root.render(<App show={false} step={2} />);
    });
    // The update is prerendered but no effects are fired
    assertLog([2]);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop={2} />);

    // Reveal the tree.
    await act(() => {
      root.render(<App show={true} step={2} />);
    });
    // The update doesn't render because it was already prerendered, but we do
    // fire the effect.
    assertLog(['Commit mount [2]']);
    expect(root).toMatchRenderedOutput(<span prop={2} />);
  });

  it('passive effects are unmounted on hide in the same order as during a deletion: parent before child', async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount Child');
        return () => {
          Scheduler.log('Unmount Child');
        };
      }, []);
      return <div>Hi</div>;
    }
    function Parent() {
      useEffect(() => {
        Scheduler.log('Mount Parent');
        return () => {
          Scheduler.log('Unmount Parent');
        };
      }, []);
      return <Child />;
    }

    function App({show}) {
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          <Parent />
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App show={true} />);
    });
    assertLog(['Mount Child', 'Mount Parent']);

    // First demonstrate what happens during a normal deletion
    await act(() => {
      root.render(null);
    });
    assertLog(['Unmount Parent', 'Unmount Child']);

    // Now redo the same thing but hide instead of deleting
    await act(() => {
      root.render(<App show={true} />);
    });
    assertLog(['Mount Child', 'Mount Parent']);
    await act(() => {
      root.render(<App show={false} />);
    });
    // The order is the same as during a deletion: parent before child
    assertLog(['Unmount Parent', 'Unmount Child']);
  });

  // TODO: As of now, there's no way to hide a tree without also unmounting its
  // effects. (Except for Suspense, which has its own tests associated with it.)
  // Re-enable this test once we add this ability. For example, we'll likely add
  // either an option or a heuristic to mount passive effects inside a hidden
  // tree after a delay.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("don't defer passive effects when prerendering in a tree whose effects are already connected", async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return <Text text={label} />;
    }

    function App({showMore, step}) {
      return (
        <>
          <Child label={'Shell ' + step} />
          <Activity mode={showMore ? 'visible' : 'hidden'}>
            <Child label={'More ' + step} />
          </Activity>
        </>
      );
    }

    const root = ReactNoop.createRoot();

    // Mount the app, including the extra content
    await act(() => {
      root.render(<App showMore={true} step={1} />);
    });
    assertLog(['Shell 1', 'More 1', 'Mount Shell 1', 'Mount More 1']);
    expect(root).toMatchRenderedOutput(
      <>
        <span prop="Shell 1" />
        <span prop="More 1" />
      </>,
    );

    // Hide the extra content. while also updating one of its props
    await act(() => {
      root.render(<App showMore={false} step={2} />);
    });
    assertLog([
      // First update the outer visible shell
      'Shell 2',
      'Unmount Shell 1',
      'Mount Shell 2',

      // Then prerender the update to the hidden content. Since the effects
      // are already connected inside the hidden tree, we don't defer updates
      // to them.
      'More 2',
      'Unmount More 1',
      'Mount More 2',
    ]);
  });

  it('does not mount effects when prerendering a nested Activity boundary', async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return <Text text={label} />;
    }

    function App({showOuter, showInner}) {
      return (
        <Activity mode={showOuter ? 'visible' : 'hidden'}>
          {useMemo(
            () => (
              <div>
                <Child label="Outer" />
                {showInner ? (
                  <Activity mode="visible">
                    <div>
                      <Child label="Inner" />
                    </div>
                  </Activity>
                ) : null}
              </div>
            ),
            [showInner],
          )}
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender the outer contents. No effects should mount.
    await act(() => {
      root.render(<App showOuter={false} showInner={false} />);
    });
    assertLog(['Outer']);
    expect(root).toMatchRenderedOutput(
      <div hidden={true}>
        <span prop="Outer" />
      </div>,
    );

    // Prerender the inner contents. No effects should mount.
    await act(() => {
      root.render(<App showOuter={false} showInner={true} />);
    });
    assertLog(['Outer', 'Inner']);
    expect(root).toMatchRenderedOutput(
      <div hidden={true}>
        <span prop="Outer" />
        <div>
          <span prop="Inner" />
        </div>
      </div>,
    );

    // Reveal the prerendered tree
    await act(() => {
      root.render(<App showOuter={true} showInner={true} />);
    });
    // The effects fire, but the tree is not re-rendered because it already
    // prerendered.
    assertLog(['Mount Outer', 'Mount Inner']);
    expect(root).toMatchRenderedOutput(
      <div>
        <span prop="Outer" />
        <div>
          <span prop="Inner" />
        </div>
      </div>,
    );
  });

  it('reveal an outer Activity boundary without revealing an inner one', async () => {
    function Child({label}) {
      useEffect(() => {
        Scheduler.log('Mount ' + label);
        return () => {
          Scheduler.log('Unmount ' + label);
        };
      }, [label]);
      return <Text text={label} />;
    }

    function App({showOuter, showInner}) {
      return (
        <Activity mode={showOuter ? 'visible' : 'hidden'}>
          {useMemo(
            () => (
              <div>
                <Child label="Outer" />
                <Activity mode={showInner ? 'visible' : 'hidden'}>
                  <div>
                    <Child label="Inner" />
                  </div>
                </Activity>
              </div>
            ),
            [showInner],
          )}
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender the whole tree.
    await act(() => {
      root.render(<App showOuter={false} showInner={false} />);
    });
    assertLog(['Outer', 'Inner']);
    // Both the inner and the outer tree should be hidden. Hiding the inner tree
    // is arguably redundant, but the advantage of hiding both is that later you
    // can reveal the outer tree without having to examine the inner one.
    expect(root).toMatchRenderedOutput(
      <div hidden={true}>
        <span prop="Outer" />
        <div hidden={true}>
          <span prop="Inner" />
        </div>
      </div>,
    );

    // Reveal the outer contents. The inner tree remains hidden.
    await act(() => {
      root.render(<App showOuter={true} showInner={false} />);
    });
    assertLog(['Mount Outer']);
    expect(root).toMatchRenderedOutput(
      <div>
        <span prop="Outer" />
        <div hidden={true}>
          <span prop="Inner" />
        </div>
      </div>,
    );
  });

  it('reveal an inner Activity boundary without revealing an outer one on the same host child', async () => {
    // This ensures that no update is scheduled, which would cover up the bug if the parent
    // then re-hides the child on the way up.
    const memoizedElement = <div />;
    function App({showOuter, showInner}) {
      return (
        <Activity mode={showOuter ? 'visible' : 'hidden'} name="Outer">
          <Activity mode={showInner ? 'visible' : 'hidden'} name="Inner">
            {memoizedElement}
          </Activity>
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender the whole tree.
    await act(() => {
      root.render(<App showOuter={false} showInner={false} />);
    });
    expect(root).toMatchRenderedOutput(<div hidden={true} />);

    await act(() => {
      root.render(<App showOuter={false} showInner={true} />);
    });
    expect(root).toMatchRenderedOutput(<div hidden={true} />);
  });

  it('reveal an inner Suspense boundary without revealing an outer Activity on the same host child', async () => {
    // This ensures that no update is scheduled, which would cover up the bug if the parent
    // then re-hides the child on the way up.
    const memoizedElement = <div />;
    const promise = new Promise(() => {});
    function App({showOuter, showInner}) {
      return (
        <Activity mode={showOuter ? 'visible' : 'hidden'} name="Outer">
          <Suspense name="Inner">
            {memoizedElement}
            {showInner ? null : promise}
          </Suspense>
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Prerender the whole tree.
    await act(() => {
      root.render(<App showOuter={false} showInner={true} />);
    });
    expect(root).toMatchRenderedOutput(<div hidden={true} />);

    // Resuspend the inner.
    await act(() => {
      root.render(<App showOuter={false} showInner={false} />);
    });
    expect(root).toMatchRenderedOutput(<div hidden={true} />);

    await act(() => {
      root.render(<App showOuter={false} showInner={true} />);
    });
    expect(root).toMatchRenderedOutput(<div hidden={true} />);
  });

  it('insertion effects are not disconnected when the visibility changes', async () => {
    function Child({step}) {
      useInsertionEffect(() => {
        Scheduler.log(`Commit mount [${step}]`);
        return () => {
          Scheduler.log(`Commit unmount [${step}]`);
        };
      }, [step]);
      return <Text text={step} />;
    }

    function App({show, step}) {
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          {useMemo(
            () => (
              <Child step={step} />
            ),
            [step],
          )}
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App show={true} step={1} />);
    });
    assertLog([1, 'Commit mount [1]']);
    expect(root).toMatchRenderedOutput(<span prop={1} />);

    // Hide the tree. This will not unmount insertion effects.
    await act(() => {
      root.render(<App show={false} step={1} />);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop={1} />);

    // Update.
    await act(() => {
      root.render(<App show={false} step={2} />);
    });
    // The update is pre-rendered so insertion effects are fired
    assertLog([2, 'Commit unmount [1]', 'Commit mount [2]']);
    expect(root).toMatchRenderedOutput(<span hidden={true} prop={2} />);

    // Reveal the tree.
    await act(() => {
      root.render(<App show={true} step={2} />);
    });
    // The update doesn't render because it was already pre-rendered, and the
    // insertion effect already fired.
    assertLog([]);
    expect(root).toMatchRenderedOutput(<span prop={2} />);
  });

  it('getSnapshotBeforeUpdate does not run in hidden trees', async () => {
    let setState;

    class Child extends React.Component {
      getSnapshotBeforeUpdate(prevProps) {
        const snapshot = `snapshot-${prevProps.value}-to-${this.props.value}`;
        Scheduler.log(`getSnapshotBeforeUpdate: ${snapshot}`);
        return snapshot;
      }
      componentDidUpdate(prevProps, prevState, snapshot) {
        Scheduler.log(`componentDidUpdate: ${snapshot}`);
      }
      componentDidMount() {
        Scheduler.log('componentDidMount');
      }
      componentWillUnmount() {
        Scheduler.log('componentWillUnmount');
      }
      render() {
        Scheduler.log(`render: ${this.props.value}`);
        return <span prop={this.props.value} />;
      }
    }

    function Wrapper({show}) {
      const [value, _setState] = useState(1);
      setState = _setState;
      return (
        <Activity mode={show ? 'visible' : 'hidden'}>
          <Child value={value} />
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();

    // Initial render
    await act(() => {
      root.render(<Wrapper show={true} />);
    });
    assertLog(['render: 1', 'componentDidMount']);

    // Hide the Activity
    await act(() => {
      root.render(<Wrapper show={false} />);
    });
    assertLog([
      'componentWillUnmount',
      'render: 1',
      // Bugfix: snapshots for hidden trees should not need to be read.
      ...(gate('enableViewTransition')
        ? []
        : ['getSnapshotBeforeUpdate: snapshot-1-to-1']),
    ]);

    // Trigger an update while hidden by calling setState
    await act(() => {
      setState(2);
    });
    assertLog([
      'render: 2',
      ...(gate('enableViewTransition')
        ? []
        : ['getSnapshotBeforeUpdate: snapshot-1-to-2']),
    ]);

    // This is treated as a new mount so the snapshot also shouldn't be read.
    await act(() => {
      root.render(<Wrapper show={true} />);
    });
    assertLog([
      'render: 2',
      ...(gate('enableViewTransition')
        ? []
        : ['getSnapshotBeforeUpdate: snapshot-2-to-2']),
      'componentDidMount',
    ]);
  });

  it('warns if you pass a hidden prop', async () => {
    function App() {
      return (
        // eslint-disable-next-line react/jsx-boolean-value
        <Activity hidden>
          <div />
        </Activity>
      );
    }

    const root = ReactNoop.createRoot();
    await act(() => {
      root.render(<App show={true} step={1} />);
    });
    assertConsoleErrorDev([
      '<Activity> doesn\'t accept a hidden prop. Use mode="hidden" instead.\n' +
        '- <Activity hidden>\n' +
        '+ <Activity mode="hidden">\n' +
        '    in Activity (at **)\n' +
        '    in App (at **)',
    ]);
  });
});
