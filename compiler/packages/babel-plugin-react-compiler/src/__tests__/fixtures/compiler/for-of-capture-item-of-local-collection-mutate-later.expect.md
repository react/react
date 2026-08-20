
## Input

```javascript
import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  let lastItem = {};
  const items = [makeObject_Primitives(), makeObject_Primitives()];
  for (const x of items) {
    lastItem = x;
  }
  if (lastItem != null) {
    lastItem.a += 1;
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeObject_Primitives } from "shared-runtime";

function Component(props) {
  const $ = _c(1);
  let items;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let lastItem = {};
    items = [makeObject_Primitives(), makeObject_Primitives()];
    for (const x of items) {
      lastItem = x;
    }

    if (lastItem != null) {
      lastItem.a = lastItem.a + 1;
    }
    $[0] = items;
  } else {
    items = $[0];
  }

  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) [{"a":0,"b":"value1","c":true},{"a":1,"b":"value1","c":true}]
[{"a":0,"b":"value1","c":true},{"a":1,"b":"value1","c":true}]