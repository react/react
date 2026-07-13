let React;
let Activity;
let ReactNoop;
let act;
let log;

describe('Activity StrictMode', () => {
  beforeEach(() => {
    jest.resetModules();
    log = [];

    React = require('react');
    Activity = React.Activity;
    ReactNoop = require('react-noop-renderer');
    act = require('internal-test-utils').act;
  });

  function Component({label}) {
    React.useEffect(() => {
      log.push(`${label}: useEffect mount`);
      return () => log.push(`${label}: useEffect unmount`);
    });

    React.useLayoutEffect(() => {
      log.push(`${label}: useLayoutEffect mount`);
      return () => log.push(`${label}: useLayoutEffect unmount`);
    });

    log.push(`${label}: render`);

    return <span>label</span>;
  }

  // @gate __DEV__
  it('should trigger strict effects when offscreen is visible', async () => {
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Component label="A" />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'A: render',
      'A: render',
      'A: useLayoutEffect mount',
      'A: useEffect mount',
      'A: useLayoutEffect unmount',
      'A: useEffect unmount',
      'A: useLayoutEffect mount',
      'A: useEffect mount',
    ]);
  });

  // @gate __DEV__
  it('should not trigger strict effects when offscreen is hidden', async () => {
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="hidden">
            <Component label="A" />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['A: render', 'A: render']);

    log = [];

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="hidden">
            <Component label="A" />
            <Component label="B" />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['A: render', 'A: render', 'B: render', 'B: render']);

    log = [];

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Component label="A" />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'A: render',
      'A: render',
      'A: useLayoutEffect mount',
      'A: useEffect mount',
      'A: useLayoutEffect unmount',
      'A: useEffect unmount',
      'A: useLayoutEffect mount',
      'A: useEffect mount',
    ]);

    log = [];

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="hidden">
            <Component label="A" />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'A: useLayoutEffect unmount',
      'A: useEffect unmount',
      'A: render',
      'A: render',
    ]);
  });

  it('should not cause infinite render loop when StrictMode is used with Suspense and synchronous set states', async () => {
    // This is a regression test, see https://github.com/facebook/react/pull/25179 for more details.
    function App() {
      const [state, setState] = React.useState(false);

      React.useLayoutEffect(() => {
        setState(true);
      }, []);

      React.useEffect(() => {
        // Empty useEffect with empty dependency array is needed to trigger infinite render loop.
      }, []);

      return state;
    }

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <React.Suspense>
            <App />
          </React.Suspense>
        </React.StrictMode>,
      );
    });
  });

  // @gate __DEV__
  it('should double invoke effects on unsuspended child', async () => {
    let shouldSuspend = true;
    let resolve;
    const suspensePromise = new Promise(_resolve => {
      resolve = _resolve;
    });

    function Parent() {
      log.push('Parent rendered');
      React.useEffect(() => {
        log.push('Parent mount');
        return () => {
          log.push('Parent unmount');
        };
      });

      return (
        <React.Suspense fallback="fallback">
          <Child />
        </React.Suspense>
      );
    }

    function Child() {
      log.push('Child rendered');
      React.useEffect(() => {
        log.push('Child mount');
        return () => {
          log.push('Child unmount');
        };
      });
      if (shouldSuspend) {
        log.push('Child suspended');
        throw suspensePromise;
      }
      return null;
    }

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Parent />
          </Activity>
        </React.StrictMode>,
      );
    });

    log.push('------------------------------');

    await act(() => {
      resolve();
      shouldSuspend = false;
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child rendered',
      'Child suspended',
      'Parent mount',
      'Parent unmount',
      'Parent mount',
      // pre-warming
      'Child rendered',
      'Child suspended',
      // end pre-warming
      '------------------------------',
      'Child rendered',
      'Child rendered',
      'Child mount',
      'Child unmount',
      'Child mount',
    ]);
  });

  // @gate __DEV__
  it('should double invoke effects on newly inserted children while Activity becomes visible', async () => {
    function Parent({children}) {
      log.push('Parent rendered');
      React.useEffect(() => {
        log.push('Parent mount');
        return () => {
          log.push('Parent unmount');
        };
      });

      return <div>{children}</div>;
    }

    function Child({name}) {
      log.push(`Child ${name} rendered`);
      React.useEffect(() => {
        log.push(`Child ${name} mount`);
        return () => {
          log.push(`Child ${name} unmount`);
        };
      });

      return null;
    }

    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="hidden">
            <Parent />
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual(['Parent rendered', 'Parent rendered']);

    log.length = 0;
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Parent>
              <Child name="one" />
            </Parent>
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child one rendered',
      'Child one rendered',
      'Child one mount',
      'Parent mount',
      // StrictMode double invocation
      'Parent unmount',
      'Child one unmount',
      'Child one mount',
      'Parent mount',
    ]);

    log.length = 0;
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Parent>
              <Child name="one" />
            </Parent>
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child one rendered',
      'Child one rendered',
      // single Effect invocation. No double invocation on update.
      'Child one unmount',
      'Parent unmount',
      'Child one mount',
      'Parent mount',
    ]);

    log.length = 0;
    await act(() => {
      ReactNoop.render(
        <React.StrictMode>
          <Activity mode="visible">
            <Parent>
              <Child name="one" />
              <Child name="two" />
            </Parent>
          </Activity>
        </React.StrictMode>,
      );
    });

    expect(log).toEqual([
      'Parent rendered',
      'Parent rendered',
      'Child one rendered',
      'Child one rendered',
      'Child two rendered',
      'Child two rendered',
      // single Effect invocation for existing Components.
      'Child one unmount',
      'Parent unmount',
      'Child one mount',
      'Child two mount',
      'Parent mount',
      // Double Effect invocation for new Component "two"
      'Child two unmount',
      'Child two mount',
    ]);
  });
});
