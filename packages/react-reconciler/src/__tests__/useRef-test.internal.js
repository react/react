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

describe('useRef', () => {
  let React;
  let ReactNoop;
  let Scheduler;
  let act;
  let useCallback;
  let useEffect;
  let useLayoutEffect;
  let useRef;
  let useState;
  let waitForAll;
  let assertLog;

  beforeEach(() => {
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');

    act = require('internal-test-utils').act;
    useCallback = React.useCallback;
    useEffect = React.useEffect;
    useLayoutEffect = React.useLayoutEffect;
    useRef = React.useRef;
    useState = React.useState;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    assertLog = InternalTestUtils.assertLog;
  });

  function Text(props) {
    Scheduler.log(props.text);
    return <span prop={props.text} />;
  }

  it('creates a ref object initialized with the provided value', async () => {
    jest.useFakeTimers();

    function useDebouncedCallback(callback, ms, inputs) {
      const timeoutID = useRef(-1);
      useEffect(() => {
        return function unmount() {
          clearTimeout(timeoutID.current);
        };
      }, []);
      const debouncedCallback = useCallback(
        (...args) => {
          clearTimeout(timeoutID.current);
          timeoutID.current = setTimeout(callback, ms, ...args);
        },
        [callback, ms],
      );
      return useCallback(debouncedCallback, inputs);
    }

    let ping;
    function App() {
      ping = useDebouncedCallback(
        value => {
          Scheduler.log('ping: ' + value);
        },
        100,
        [],
      );
      return null;
    }

    await act(() => {
      ReactNoop.render(<App />);
    });
    assertLog([]);

    ping(1);
    ping(2);
    ping(3);

    assertLog([]);

    jest.advanceTimersByTime(100);

    assertLog(['ping: 3']);

    ping(4);
    jest.advanceTimersByTime(20);
    ping(5);
    ping(6);
    jest.advanceTimersByTime(80);

    assertLog([]);

    jest.advanceTimersByTime(20);
    assertLog(['ping: 6']);
  });

  it('should return the same ref during re-renders', async () => {
    function Counter() {
      const ref = useRef('val');
      const [count, setCount] = useState(0);
      const [firstRef] = useState(ref);

      if (firstRef !== ref) {
        throw new Error('should never change');
      }

      if (count < 3) {
        setCount(count + 1);
      }

      return <Text text={count} />;
    }

    ReactNoop.render(<Counter />);
    await waitForAll([3]);

    ReactNoop.render(<Counter />);
    await waitForAll([3]);
  });

  if (__DEV__) {
    it('should never warn when attaching to children', async () => {
      class Component extends React.Component {
        render() {
          return null;
        }
      }

      function Example({phase}) {
        const hostRef = useRef();
        const classRef = useRef();
        return (
          <>
            <div key={`host-${phase}`} ref={hostRef} />
            <Component key={`class-${phase}`} ref={classRef} />
          </>
        );
      }

      await act(() => {
        ReactNoop.render(<Example phase="mount" />);
      });
      await act(() => {
        ReactNoop.render(<Example phase="update" />);
      });
    });

    it('should not warn about lazy init during render', async () => {
      function Example() {
        const ref1 = useRef(null);
        const ref2 = useRef(undefined);
        // Read: safe because lazy init:
        if (ref1.current === null) {
          ref1.current = 123;
        }
        if (ref2.current === undefined) {
          ref2.current = 123;
        }
        return null;
      }

      await act(() => {
        ReactNoop.render(<Example />);
      });

      // Should not warn after an update either.
      await act(() => {
        ReactNoop.render(<Example />);
      });
    });

    it('should not warn about lazy init outside of render', async () => {
      function Example() {
        // eslint-disable-next-line no-unused-vars
        const [didMount, setDidMount] = useState(false);
        const ref1 = useRef(null);
        const ref2 = useRef(undefined);
        useLayoutEffect(() => {
          ref1.current = 123;
          ref2.current = 123;
          setDidMount(true);
        }, []);
        return null;
      }

      await act(() => {
        ReactNoop.render(<Example />);
      });
    });

    it('should not warn about reads or writes within effect', async () => {
      function Example() {
        const ref = useRef(123);
        useLayoutEffect(() => {
          expect(ref.current).toBe(123);
          ref.current = 456;
          expect(ref.current).toBe(456);
        }, []);
        useEffect(() => {
          expect(ref.current).toBe(456);
          ref.current = 789;
          expect(ref.current).toBe(789);
        }, []);
        return null;
      }

      await act(() => {
        ReactNoop.render(<Example />);
      });

      ReactNoop.flushPassiveEffects();
    });

    it('should not warn about reads or writes outside of render phase (e.g. event handler)', async () => {
      let ref;
      function Example() {
        ref = useRef(123);
        return null;
      }

      await act(() => {
        ReactNoop.render(<Example />);
      });

      expect(ref.current).toBe(123);
      ref.current = 456;
      expect(ref.current).toBe(456);
    });
  }
});
