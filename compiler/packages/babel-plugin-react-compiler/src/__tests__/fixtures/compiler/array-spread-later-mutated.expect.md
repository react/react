
## Input

```javascript
function useBar({arg}) {
  /**
   * Note that mutableIterator is mutated by the later object spread. Therefore,
   * `s.values()` should be memoized within the same block as the object spread.
   * In terms of compiler internals, they should have the same reactive scope.
   */
  const obj = {};
  const s = new Set([obj, 5, 4]);
  const mutableIterator = s.values();
  const arr = [...mutableIterator];

  obj.x = arg;
  return arr;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useBar,
  params: [{arg: 3}],
  sequentialRenders: [{arg: 3}, {arg: 3}, {arg: 4}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useBar(t0) {
  const $ = _c(2);
  const { arg } = t0;
  let arr;
  if ($[0] !== arg) {
    const obj = {};
    const s = new Set([obj, 5, 4]);
    const mutableIterator = s.values();
    arr = [...mutableIterator];

    obj.x = arg;
    $[0] = arg;
    $[1] = arr;
  } else {
    arr = $[1];
  }
  return arr;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useBar,
  params: [{ arg: 3 }],
  sequentialRenders: [{ arg: 3 }, { arg: 3 }, { arg: 4 }],
};

```
      
### Eval output
(kind: ok) [{"x":3},5,4]
[{"x":3},5,4]
[{"x":4},5,4]