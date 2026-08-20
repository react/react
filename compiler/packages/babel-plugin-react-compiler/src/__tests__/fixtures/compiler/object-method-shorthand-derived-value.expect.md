
## Input

```javascript
import {createHookWrapper, mutateAndReturn} from 'shared-runtime';
function useHook({value}) {
  const x = mutateAndReturn({value});
  const obj = {
    getValue() {
      return x;
    },
  };
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper, mutateAndReturn } from "shared-runtime";
function useHook(t0) {
  const $ = _c(4);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = mutateAndReturn({ value });
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const x = t1;
  let t2;
  if ($[2] !== x) {
    t2 = {
      getValue() {
        return x;
      },
    };
    $[2] = x;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const obj = t2;
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"getValue":{"kind":"Function","result":{"value":0,"wat0":"joe"}}},"shouldInvokeFns":true}</div>