
## Input

```javascript
import {arrayPush} from 'shared-runtime';

function useFoo({cond, value}) {
  let items;
  label: {
    items = [];
    // Mutable range of `items` begins here, but its reactive scope block
    // should be aligned to above the label-block
    if (cond) break label;
    arrayPush(items, value);
  }
  arrayPush(items, value);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{cond: true, value: 2}],
  sequentialRenders: [
    {cond: true, value: 2},
    {cond: true, value: 2},
    {cond: true, value: 3},
    {cond: false, value: 3},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { arrayPush } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(3);
  const { cond, value } = t0;
  let items;
  if ($[0] !== cond || $[1] !== value) {
    bb0: {
      items = [];

      if (cond) {
        break bb0;
      }
      arrayPush(items, value);
    }

    arrayPush(items, value);
    $[0] = cond;
    $[1] = value;
    $[2] = items;
  } else {
    items = $[2];
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ cond: true, value: 2 }],
  sequentialRenders: [
    { cond: true, value: 2 },
    { cond: true, value: 2 },
    { cond: true, value: 3 },
    { cond: false, value: 3 },
  ],
};

```
      
### Eval output
(kind: ok) [2]
[2]
[3]
[3,3]