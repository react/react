
## Input

```javascript
import {mutate} from 'shared-runtime';
function useHook({a, b}) {
  let y = {a};
  let x = {b};
  x['y'] = y;
  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 2, b: 3}],
  sequentialRenders: [
    {a: 2, b: 3},
    {a: 2, b: 3},
    {a: 3, b: 3},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutate } from "shared-runtime";
function useHook(t0) {
  const $ = _c(3);
  const { a, b } = t0;
  let x;
  if ($[0] !== a || $[1] !== b) {
    const y = { a };
    x = { b };
    x.y = y;
    mutate(x);
    $[0] = a;
    $[1] = b;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{ a: 2, b: 3 }],
  sequentialRenders: [
    { a: 2, b: 3 },
    { a: 2, b: 3 },
    { a: 3, b: 3 },
  ],
};

```
      
### Eval output
(kind: ok) {"b":3,"y":{"a":2},"wat0":"joe"}
{"b":3,"y":{"a":2},"wat0":"joe"}
{"b":3,"y":{"a":3},"wat0":"joe"}