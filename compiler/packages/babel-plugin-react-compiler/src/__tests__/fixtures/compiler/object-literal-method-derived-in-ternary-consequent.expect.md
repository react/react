
## Input

```javascript
import {identity, createHookWrapper} from 'shared-runtime';

function useHook({isCond, value}) {
  return isCond
    ? identity({
        getValue() {
          return value;
        },
      })
    : 42;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{isCond: true, value: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, createHookWrapper } from "shared-runtime";

function useHook(t0) {
  const $ = _c(3);
  const { isCond, value } = t0;
  let t1;
  if ($[0] !== isCond || $[1] !== value) {
    t1 = isCond
      ? identity({
          getValue() {
            return value;
          },
        })
      : 42;
    $[0] = isCond;
    $[1] = value;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ isCond: true, value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"getValue":{"kind":"Function","result":0}},"shouldInvokeFns":true}</div>