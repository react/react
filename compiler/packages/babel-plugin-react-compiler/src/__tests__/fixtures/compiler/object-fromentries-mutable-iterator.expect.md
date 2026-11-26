
## Input

```javascript
function useEntries({a, consume}) {
  const entries = [['key', a]].values();
  if (consume) {
    Object.fromEntries(entries);
  }
  return Object.fromEntries(entries);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{a: 42, consume: false}],
  sequentialRenders: [
    {a: 42, consume: false},
    {a: 42, consume: true},
    {a: 42, consume: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useEntries(t0) {
  const $ = _c(3);
  const { a, consume } = t0;
  let t1;
  if ($[0] !== a || $[1] !== consume) {
    const entries = [["key", a]].values();
    if (consume) {
      Object.fromEntries(entries);
    }
    t1 = Object.fromEntries(entries);
    $[0] = a;
    $[1] = consume;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{ a: 42, consume: false }],
  sequentialRenders: [
    { a: 42, consume: false },
    { a: 42, consume: true },
    { a: 42, consume: false },
  ],
};

```
      
### Eval output
(kind: ok) {"key":42}
{}
{"key":42}