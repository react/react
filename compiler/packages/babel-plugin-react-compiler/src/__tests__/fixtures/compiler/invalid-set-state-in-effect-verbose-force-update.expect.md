
## Input

```javascript
// @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import {useState, useEffect} from 'react';

const externalStore = {
  value: 0,
  subscribe(callback) {
    return () => {};
  },
  getValue() {
    return this.value;
  },
};

function ExternalDataComponent() {
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const unsubscribe = externalStore.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);
  return <div>{externalStore.getValue()}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ExternalDataComponent,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInEffects @enableVerboseNoSetStateInEffect
import { useState, useEffect } from "react";

const externalStore = {
  value: 0,
  subscribe(callback) {
    return () => {};
  },
  getValue() {
    return this.value;
  },
};

function ExternalDataComponent() {
  const $ = _c(4);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const [, forceUpdate] = useState(t0);
  let t1;
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      const unsubscribe = externalStore.subscribe(() => {
        forceUpdate({});
      });
      return unsubscribe;
    };
    t2 = [];
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  useEffect(t1, t2);
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <div>{externalStore.getValue()}</div>;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ExternalDataComponent,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>0</div>