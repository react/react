
## Input

```javascript
function Component() {
  'use strict';
  let [count, setCount] = React.useState(0);
  const update = () => {
    'worklet';
    setCount(count => count + 1);
  };
  return <button onClick={update}>{count}</button>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  "use strict";
  const $ = _c(3);

  const [count, setCount] = React.useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      "worklet";

      setCount((count_0) => count_0 + 1);
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const update = t0;
  let t1;
  if ($[1] !== count) {
    t1 = <button onClick={update}>{count}</button>;
    $[1] = count;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented