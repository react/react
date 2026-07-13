
## Input

```javascript
import {makeObject_Primitives, mutateAndReturn, toJSON} from 'shared-runtime';

function Component(_props) {
  const collection = [makeObject_Primitives()];
  const results = [];
  for (const item of collection) {
    results.push(<div key={toJSON(item)}>{toJSON(mutateAndReturn(item))}</div>);
  }
  return <div>{results}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeObject_Primitives, mutateAndReturn, toJSON } from "shared-runtime";

function Component(_props) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const collection = [makeObject_Primitives()];
    const results = [];
    for (const item of collection) {
      results.push(
        <div key={toJSON(item)}>{toJSON(mutateAndReturn(item))}</div>,
      );
    }
    t0 = <div>{results}</div>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div><div>{"a":0,"b":"value1","c":true,"wat0":"joe"}</div></div>