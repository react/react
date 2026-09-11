
## Input

```javascript
// @compilationMode:"annotation"
function Component({count, maybe}) {
  'use memo';
  const value = {count};
  try {
    const unused = maybe.item;
    value.count++;
  } catch {
    value.count += 10;
  }
  return value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 1, maybe: null}],
  sequentialRenders: [
    {count: 1, maybe: null},
    {count: 1, maybe: null},
    {count: 1, maybe: {item: 'ok'}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"annotation"
function Component(t0) {
  "use memo";
  const $ = _c(3);
  const { count, maybe } = t0;
  let value;
  if ($[0] !== count || $[1] !== maybe) {
    value = { count };
    try {
      maybe.item;
      value.count = value.count + 1;
    } catch {
      value.count = value.count + 10;
    }
    $[0] = count;
    $[1] = maybe;
    $[2] = value;
  } else {
    value = $[2];
  }

  return value.count;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ count: 1, maybe: null }],
  sequentialRenders: [
    { count: 1, maybe: null },
    { count: 1, maybe: null },
    { count: 1, maybe: { item: "ok" } },
  ],
};

```
      
### Eval output
(kind: ok) 11
11
2