
## Input

```javascript
function useEntries({a}) {
  const state = {count: 0};
  const key = {
    toString: () => {
      state.count++;
      return 'key';
    },
  };
  const result = Object.fromEntries([[key, a]]);
  return [result, state.count];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{a: 1}],
  sequentialRenders: [{a: 1}, {a: 2}, {a: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useEntries(t0) {
  const $ = _c(6);
  const { a } = t0;
  let state;
  let t1;
  if ($[0] !== a) {
    state = { count: 0 };
    const key = {
      toString: () => {
        state.count = state.count + 1;
        return "key";
      },
    };
    t1 = Object.fromEntries([[key, a]]);
    $[0] = a;
    $[1] = state;
    $[2] = t1;
  } else {
    state = $[1];
    t1 = $[2];
  }
  const result = t1;
  let t2;
  if ($[3] !== result || $[4] !== state.count) {
    t2 = [result, state.count];
    $[3] = result;
    $[4] = state.count;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{ a: 1 }],
  sequentialRenders: [{ a: 1 }, { a: 2 }, { a: 3 }],
};

```
      
### Eval output
(kind: ok) [{"key":1},1]
[{"key":2},1]
[{"key":3},1]