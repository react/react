
## Input

```javascript
import {useState} from 'react';

function Component() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      {/**
       * The scope for the <button> depends on just the scope for the callback,
       * but the previous scope (after merging) will declare both the above
       * <button> and the callback.
       */}
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useState } from "react";

function Component() {
  const $ = _c(2);
  const [count, setCount] = useState(0);
  let t0;
  if ($[0] !== count) {
    t0 = (
      <div>
        <button onClick={() => setCount(count - 1)}>Decrement</button>

        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
    );
    $[0] = count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div><button>Decrement</button><button>Increment</button></div>