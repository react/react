
## Input

```javascript
import {createHookWrapper, mutate} from 'shared-runtime';

function useHook(a) {
  const x = {a};
  let obj = {
    method() {
      mutate(x);
      return x;
    },
  };
  return obj.method();
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{x: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper, mutate } from "shared-runtime";

function useHook(a) {
  const $ = _c(2);
  let t0;
  if ($[0] !== a) {
    const x = { a };
    const obj = {
      method() {
        mutate(x);
        return x;
      },
    };
    t0 = obj.method();
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ x: 1 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"a":{"x":1},"wat0":"joe"},"shouldInvokeFns":true}</div>