# use-subscription

React Hook for subscribing to external data sources.

**You may now migrate to [`use-sync-external-store`](https://www.npmjs.com/package/use-sync-external-store) directly instead, which has the same API as [`React.useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore). The `use-subscription` package is now a thin wrapper over `use-sync-external-store` and will not be updated further.**

# Installation

```sh
# Yarn
yarn add use-subscription

# NPM
npm install use-subscription
```

# Usage

To configure a subscription, you must provide two methods: `getCurrentValue` and `subscribe`.

In order to avoid removing and re-adding subscriptions each time this hook is called, the parameters passed to this hook should be memoized. This can be done by wrapping the entire subscription with `useMemo()`, or by wrapping the individual callbacks with `useCallback()`.

## Subscribing to event dispatchers

Below is an example showing how `use-subscription` can be used to subscribe to event dispatchers such as DOM elements.

```js
import React, { useMemo } from "react";
import { useSubscription } from "use-subscription";

// In this example, "input" is an event dispatcher (e.g. an HTMLInputElement)
// but it could be anything that emits an event and has a readable current value.
function Example({ input }) {

  // Memoize to avoid removing and re-adding subscriptions each time this hook is called.
  const subscription = useMemo(
    () => ({
      getCurrentValue: () => input.value,
      subscribe: callback => {
        input.addEventListener("change", callback);
        return () => input.removeEventListener("change", callback);
      }
    }),

    // Re-subscribe any time our input changes
    // (e.g. we get a new HTMLInputElement prop to subscribe to)
    [input]
  );

  // The value returned by this hook reflects the input's current value.
  // Our component will automatically be re-rendered when that value changes.
  const value = useSubscription(subscription);

  // Your rendered output goes here ...
}
```

## Subscribing to observables

Below are examples showing how `use-subscription` can be used to subscribe to certain types of observables (e.g. RxJS `BehaviorSubject` and `ReplaySubject`).

**Note** that it is not possible to support all observable types (e.g. RxJS `Subject` or `Observable`) because some provide no way to read the "current" value after it has been emitted.

### `BehaviorSubject`
```js
const subscription = useMemo(
  () => ({
    getCurrentValue: () => behaviorSubject.getValue(),
    subscribe: callback => {
      const subscription = behaviorSubject.subscribe(callback);
      return () => subscription.unsubscribe();
    }
  }),

  // Re-subscribe any time the behaviorSubject changes
  [behaviorSubject]
);

const value = useSubscription(subscription);
```

### `ReplaySubject`
```js
const subscription = useMemo(
  () => ({
    getCurrentValue: () => {
      let currentValue;
      // ReplaySubject does not have a sync data getter,
      // So we need to temporarily subscribe to retrieve the most recent value.
      replaySubject
        .subscribe(value => {
          currentValue = value;
        })
        .unsubscribe();
      return currentValue;
    },
    subscribe: callback => {
      const subscription = replaySubject.subscribe(callback);
      return () => subscription.unsubscribe();
    }
  }),

  // Re-subscribe any time the replaySubject changes
  [replaySubject]
);

const value = useSubscription(subscription);
```
