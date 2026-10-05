
## Input

```javascript
// @compilationMode:"infer"
import {useEffect, useEffectEvent, useState} from 'react';

// Repro from https://github.com/facebook/react/issues/37209
// The effect event reads `length`, which is declared after the callback.
// The callback must not be memoized, so it always sees the latest value.
export default function App() {
  const [data, setData] = useState([]);

  const logLength = useEffectEvent(() => {
    console.log('length', length);
  });

  const length = data.length - 0;

  useEffect(() => {
    setTimeout(() => setData([1, 2]), 300);

    addEventListener('click', logLength);
    return () => removeEventListener('click', logLength);
  }, []);

  return <div>Click anywhere to log the length</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: App,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { useEffect, useEffectEvent, useState } from "react";

// Repro from https://github.com/facebook/react/issues/37209
// The effect event reads `length`, which is declared after the callback.
// The callback must not be memoized, so it always sees the latest value.
export default function App() {
  const $ = _c(5);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const [data, setData] = useState(t0);

  const logLength = useEffectEvent(() => {
    console.log("length", length);
  });

  const length = data.length - 0;
  let t1;
  if ($[1] !== logLength) {
    t1 = () => {
      setTimeout(() => setData([1, 2]), 300);

      addEventListener("click", logLength);
      return () => removeEventListener("click", logLength);
    };
    $[1] = logLength;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = [];
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  useEffect(t1, t2);
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <div>Click anywhere to log the length</div>;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: App,
  params: [{}],
};

```
      
### Eval output
(kind: exception) (0 , _react.useEffectEvent) is not a function