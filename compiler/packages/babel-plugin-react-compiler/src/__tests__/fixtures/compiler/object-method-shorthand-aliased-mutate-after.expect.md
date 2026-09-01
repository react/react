
## Input

```javascript
import {createHookWrapper, mutate, mutateAndReturn} from 'shared-runtime';
function useHook({value}) {
  const x = mutateAndReturn({value});
  const obj = {
    getValue() {
      return value;
    },
  };
  mutate(x);
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
import { createHookWrapper, mutate, mutateAndReturn } from "shared-runtime";
function useHook(t0) {
  const $ = _c(2);
  const { value } = t0;
  let obj;
  if ($[0] !== value) {
    const x = mutateAndReturn({ value });
    obj = {
      getValue() {
        return value;
      },
    };
    mutate(x);
    $[0] = value;
    $[1] = obj;
  } else {
    obj = $[1];
  }
  return obj;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"getValue":{"kind":"Function","result":0}},"shouldInvokeFns":true}</div>