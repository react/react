
## Input

```javascript
// @loggerTestOnly
import {createContext, use, useState} from 'react';
import {
  Stringify,
  identity,
  makeObject_Primitives,
  useHook,
} from 'shared-runtime';

function Component() {
  const w = use(Context);

  // The scopes for x and x2 are interleaved, so this is one scope with two values
  const x = makeObject_Primitives();
  const x2 = makeObject_Primitives();
  useState(null);
  identity(x);
  identity(x2);

  // We create a scope for all call expressions, but prune those with hook calls
  // in this case it's _just_ a hook call, so we don't count this as pruned
  const y = useHook();

  const z = [];
  for (let i = 0; i < 10; i++) {
    // The scope for obj is pruned bc it's in a loop
    const obj = makeObject_Primitives();
    z.push(obj);
  }

  // Overall we expect two pruned scopes (for x+x2, and obj), with 3 pruned scope values.
  return <Stringify items={[w, x, x2, y, z]} />;
}

const Context = createContext();

function Wrapper() {
  return (
    <Context value={42}>
      <Component />
    </Context>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Wrapper,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @loggerTestOnly
import { createContext, use, useState } from "react";
import {
  Stringify,
  identity,
  makeObject_Primitives,
  useHook,
} from "shared-runtime";

function Component() {
  const $ = _c(6);
  const w = use(Context);

  const x = makeObject_Primitives();
  const x2 = makeObject_Primitives();
  useState(null);
  identity(x);
  identity(x2);

  const y = useHook();
  let z;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    z = [];
    for (let i = 0; i < 10; i++) {
      const obj = makeObject_Primitives();
      z.push(obj);
    }
    $[0] = z;
  } else {
    z = $[0];
  }
  let t0;
  if ($[1] !== w || $[2] !== x || $[3] !== x2 || $[4] !== y) {
    t0 = <Stringify items={[w, x, x2, y, z]} />;
    $[1] = w;
    $[2] = x;
    $[3] = x2;
    $[4] = y;
    $[5] = t0;
  } else {
    t0 = $[5];
  }
  return t0;
}

const Context = createContext();

function Wrapper() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <Context value={42}>
        <Component />
      </Context>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Wrapper,
  params: [{}],
};

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":10,"column":0,"index":167},"end":{"line":33,"column":1,"index":911},"filename":"log-pruned-memoization.ts"},"fnName":"Component","memoSlots":6,"memoBlocks":2,"memoValues":2,"prunedMemoBlocks":2,"prunedMemoValues":3}
{"kind":"CompileSuccess","fnLoc":{"start":{"line":37,"column":0,"index":947},"end":{"line":43,"column":1,"index":1045},"filename":"log-pruned-memoization.ts"},"fnName":"Wrapper","memoSlots":1,"memoBlocks":1,"memoValues":1,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: ok) <div>{"items":[42,{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},[{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true},{"a":0,"b":"value1","c":true}]]}</div>