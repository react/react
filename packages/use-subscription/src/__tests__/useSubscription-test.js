/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let act;
let useSubscription;
let BehaviorSubject;
let React;
let ReactDOMClient;
let Scheduler;
let ReplaySubject;
let assertLog;
let waitForAll;
let waitFor;
let waitForPaint;

describe('useSubscription', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('scheduler', () => require('scheduler/unstable_mock'));

    useSubscription = require('use-subscription').useSubscription;
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    Scheduler = require('scheduler');

    act = require('internal-test-utils').act;

    BehaviorSubject = require('rxjs').BehaviorSubject;
    ReplaySubject = require('rxjs').ReplaySubject;

    const InternalTestUtils = require('internal-test-utils');
    waitForAll = InternalTestUtils.waitForAll;
    waitForPaint = InternalTestUtils.waitForPaint;
    assertLog = InternalTestUtils.assertLog;
    waitFor = InternalTestUtils.waitFor;
  });

  function createBehaviorSubject(initialValue) {
    const behaviorSubject = new BehaviorSubject();
    if (initialValue) {
      behaviorSubject.next(initialValue);
    }
    return behaviorSubject;
  }

  function createReplaySubject(initialValue) {
    const replaySubject = new ReplaySubject();
    if (initialValue) {
      replaySubject.next(initialValue);
    }
    return replaySubject;
  }

  it('supports basic subscription pattern', async () => {
    function Child({value = 'default'}) {
      Scheduler.log(value);
      return null;
    }

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => source.getValue(),
            subscribe: callback => {
              const subscription = source.subscribe(callback);
              return () => subscription.unsubscribe();
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    const observable = createBehaviorSubject();
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription source={observable} />);
    });
    assertLog(['default']);

    // Updates while subscribed should re-render the child component
    await act(() => observable.next(123));
    assertLog([123]);
    await act(() => observable.next('abc'));
    assertLog(['abc']);

    // Unmounting the subscriber should remove listeners
    await act(() => root.render(<div />));
    await act(() => observable.next(456));
    await waitForAll([]);
  });

  it('should support observable types like RxJS ReplaySubject', async () => {
    function Child({value = 'default'}) {
      Scheduler.log(value);
      return null;
    }

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => {
              let currentValue;
              source
                .subscribe(tempValue => {
                  currentValue = tempValue;
                })
                .unsubscribe();
              return currentValue;
            },
            subscribe: callback => {
              const subscription = source.subscribe(callback);
              return () => subscription.unsubscribe();
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    let observable = createReplaySubject('initial');
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription source={observable} />);
    });
    assertLog(['initial']);
    await act(() => observable.next('updated'));
    assertLog(['updated']);

    await waitForAll([]);

    // Unsetting the subscriber prop should reset subscribed values
    observable = createReplaySubject(undefined);
    await act(() => root.render(<Subscription source={observable} />));
    assertLog(['default']);
  });

  it('should unsubscribe from old sources and subscribe to new sources when memoized props change', async () => {
    function Child({value = 'default'}) {
      Scheduler.log(value);
      return null;
    }

    const subscriptions = [];

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => source.getValue(),
            subscribe: callback => {
              subscriptions.push(source);
              const subscription = source.subscribe(callback);
              return () => subscription.unsubscribe();
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    const observableA = createBehaviorSubject('a-0');
    const observableB = createBehaviorSubject('b-0');

    expect(subscriptions).toHaveLength(0);

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription source={observableA} />);
    });

    // Updates while subscribed should re-render the child component
    assertLog(['a-0']);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toBe(observableA);

    // Unsetting the subscriber prop should reset subscribed values
    await act(() => root.render(<Subscription source={observableB} />));

    assertLog(['b-0']);
    expect(subscriptions).toHaveLength(2);
    expect(subscriptions[1]).toBe(observableB);

    // Updates to the old subscribable should not re-render the child component
    await act(() => observableA.next('a-1'));
    await waitForAll([]);

    // Updates to the bew subscribable should re-render the child component
    await act(() => observableB.next('b-1'));
    assertLog(['b-1']);

    expect(subscriptions).toHaveLength(2);
  });

  it('should unsubscribe from old sources and subscribe to new sources when useCallback functions change', async () => {
    function Child({value = 'default'}) {
      Scheduler.log(value);
      return null;
    }

    const subscriptions = [];

    function Subscription({source}) {
      const value = useSubscription({
        getCurrentValue: React.useCallback(() => source.getValue(), [source]),
        subscribe: React.useCallback(
          callback => {
            subscriptions.push(source);
            const subscription = source.subscribe(callback);
            return () => subscription.unsubscribe();
          },
          [source],
        ),
      });
      return <Child value={value} />;
    }

    const observableA = createBehaviorSubject('a-0');
    const observableB = createBehaviorSubject('b-0');

    expect(subscriptions).toHaveLength(0);

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription source={observableA} />);
    });

    // Updates while subscribed should re-render the child component
    assertLog(['a-0']);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toBe(observableA);

    // Unsetting the subscriber prop should reset subscribed values
    await act(() => root.render(<Subscription source={observableB} />));
    assertLog(['b-0']);
    expect(subscriptions).toHaveLength(2);
    expect(subscriptions[1]).toBe(observableB);

    // Updates to the old subscribable should not re-render the child component
    await act(() => observableA.next('a-1'));
    await waitForAll([]);

    // Updates to the bew subscribable should re-render the child component
    await act(() => observableB.next('b-1'));
    assertLog(['b-1']);

    expect(subscriptions).toHaveLength(2);
  });

  it('should ignore values emitted by a new subscribable until the commit phase', async () => {
    const log = [];

    function Grandchild({value}) {
      Scheduler.log('Grandchild: ' + value);
      return null;
    }

    function Child({value = 'default'}) {
      Scheduler.log('Child: ' + value);
      return <Grandchild value={value} />;
    }

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => source.getValue(),
            subscribe: callback => {
              const subscription = source.subscribe(callback);
              return () => subscription.unsubscribe();
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    class Parent extends React.Component {
      state = {};

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.observed !== prevState.observed) {
          return {
            observed: nextProps.observed,
          };
        }

        return null;
      }

      componentDidMount() {
        log.push('Parent.componentDidMount');
      }

      componentDidUpdate() {
        log.push('Parent.componentDidUpdate');
      }

      render() {
        return <Subscription source={this.state.observed} />;
      }
    }

    const observableA = createBehaviorSubject('a-0');
    const observableB = createBehaviorSubject('b-0');

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Parent observed={observableA} />);
    });
    assertLog(['Child: a-0', 'Grandchild: a-0']);
    expect(log).toEqual(['Parent.componentDidMount']);

    // Start React update, but don't finish
    await act(async () => {
      React.startTransition(() => {
        root.render(<Parent observed={observableB} />);
      });

      await waitFor(['Child: b-0']);
      expect(log).toEqual(['Parent.componentDidMount']);

      // Emit some updates from the uncommitted subscribable
      observableB.next('b-1');
      observableB.next('b-2');
      observableB.next('b-3');
    });

    assertLog(['Grandchild: b-0', 'Child: b-3', 'Grandchild: b-3']);

    // Update again
    await act(() => root.render(<Parent observed={observableA} />));

    // Flush everything and ensure that the correct subscribable is used
    // We expect the last emitted update to be rendered (because of the commit phase value check)
    // But the intermediate ones should be ignored,
    // And the final rendered output should be the higher-priority observable.
    assertLog(['Child: a-0', 'Grandchild: a-0']);
    expect(log).toEqual([
      'Parent.componentDidMount',
      'Parent.componentDidUpdate',
      'Parent.componentDidUpdate',
    ]);
  });

  it('should not drop values emitted between updates', async () => {
    const log = [];

    function Grandchild({value}) {
      Scheduler.log('Grandchild: ' + value);
      return null;
    }

    function Child({value = 'default'}) {
      Scheduler.log('Child: ' + value);
      return <Grandchild value={value} />;
    }

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => source.getValue(),
            subscribe: callback => {
              const subscription = source.subscribe(callback);
              return () => subscription.unsubscribe();
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    class Parent extends React.Component {
      state = {};

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.observed !== prevState.observed) {
          return {
            observed: nextProps.observed,
          };
        }

        return null;
      }

      componentDidMount() {
        log.push('Parent.componentDidMount:' + this.props.observed.value);
      }

      componentDidUpdate() {
        log.push('Parent.componentDidUpdate:' + this.props.observed.value);
      }

      render() {
        return <Subscription source={this.state.observed} />;
      }
    }

    const observableA = createBehaviorSubject('a-0');
    const observableB = createBehaviorSubject('b-0');

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Parent observed={observableA} />);
    });
    assertLog(['Child: a-0', 'Grandchild: a-0']);
    expect(log).toEqual(['Parent.componentDidMount:a-0']);
    log.splice(0);

    // Start React update, but don't finish
    await act(async () => {
      React.startTransition(() => {
        root.render(<Parent observed={observableB} />);
      });
      await waitFor(['Child: b-0']);
      expect(log).toEqual([]);

      // Emit some updates from the old subscribable
      observableA.next('a-1');
      observableA.next('a-2');

      // Update again
      React.startTransition(() => {
        root.render(<Parent observed={observableA} />);
      });

      // Flush everything and ensure that the correct subscribable is used
      await waitForAll([
        'Child: a-2',
        'Grandchild: a-2',
        'Child: a-2',
        'Grandchild: a-2',
      ]);
      expect(log).toEqual(['Parent.componentDidUpdate:a-2']);
    });

    // Updates from the new subscribable should be ignored.
    log.splice(0);
    await act(() => observableB.next('b-1'));
    await waitForAll([]);
    expect(log).toEqual([]);
  });

  it('should guard against updates that happen after unmounting', async () => {
    function Child({value = 'default'}) {
      Scheduler.log(value);
      return null;
    }

    function Subscription({source}) {
      const value = useSubscription(
        React.useMemo(
          () => ({
            getCurrentValue: () => source.getValue(),
            subscribe: callback => {
              return source.subscribe(callback);
            },
          }),
          [source],
        ),
      );
      return <Child value={value} />;
    }

    const eventHandler = {
      _callbacks: [],
      _value: true,
      change(value) {
        eventHandler._value = value;
        const _callbacks = eventHandler._callbacks.slice(0);
        _callbacks.forEach(callback => callback(value));
      },
      getValue() {
        return eventHandler._value;
      },
      subscribe(callback) {
        eventHandler._callbacks.push(callback);
        return () => {
          eventHandler._callbacks.splice(
            eventHandler._callbacks.indexOf(callback),
            1,
          );
        };
      },
    };

    eventHandler.subscribe(async value => {
      if (value === false) {
        root.unmount();
      }
    });

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription source={eventHandler} />);
    });
    assertLog([true]);

    // This event should unmount
    eventHandler.change(false);
  });

  it('does not return a value from the previous subscription if the source is updated', async () => {
    const subscription1 = {
      getCurrentValue: () => 'one',
      subscribe: () => () => {},
    };

    const subscription2 = {
      getCurrentValue: () => 'two',
      subscribe: () => () => {},
    };

    function Subscription({subscription}) {
      const value = useSubscription(subscription);
      if (value !== subscription.getCurrentValue()) {
        throw Error(
          `expected value "${subscription.getCurrentValue()}" but got value "${value}"`,
        );
      }
      return null;
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      root.render(<Subscription subscription={subscription1} />);
    });
    await waitForAll([]);

    await act(() => root.render(<Subscription subscription={subscription2} />));
    await waitForAll([]);
  });

  it('should not tear if a mutation occurs during a concurrent update', async () => {
    const input = document.createElement('input');

    const mutate = value => {
      input.value = value;
      input.dispatchEvent(new Event('change'));
    };

    const subscription = {
      getCurrentValue: () => input.value,
      subscribe: callback => {
        input.addEventListener('change', callback);
        return () => input.removeEventListener('change', callback);
      },
    };

    const Subscriber = ({id}) => {
      const value = useSubscription(subscription);
      Scheduler.log(`render:${id}:${value}`);
      return value;
    };

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(async () => {
      // Initial render of "A"
      mutate('A');
      root.render(
        <React.Fragment>
          <Subscriber id="first" />
          <Subscriber id="second" />
        </React.Fragment>,
      );
      await waitForAll(['render:first:A', 'render:second:A']);

      // Update state "A" -> "B"
      // This update will be eagerly evaluated,
      // so the tearing case this test is guarding against would not happen.
      mutate('B');
      await waitForAll(['render:first:B', 'render:second:B']);

      // No more pending updates
      jest.runAllTimers();

      // Partial update "B" -> "C"
      // Interrupt with a second mutation "C" -> "D".
      // This update will not be eagerly evaluated,
      // but useSubscription() should eagerly close over the updated value to avoid tearing.
      React.startTransition(() => {
        mutate('C');
      });
      await waitForPaint(['render:first:C', 'render:second:C']);
      React.startTransition(() => {
        mutate('D');
      });
      await waitForAll(['render:first:D', 'render:second:D']);

      // No more pending updates
      jest.runAllTimers();
    });
  });
});
