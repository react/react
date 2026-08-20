
## Input

```javascript
import {createHookWrapper, setProperty} from 'shared-runtime';
function useHook(props) {
  const x = {
    getX() {
      return props;
    },
  };
  const y = {
    getY() {
      return 'y';
    },
  };
  return setProperty(x, y);
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { createHookWrapper, setProperty } from "shared-runtime";
function useHook(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    const x = {
      getX() {
        return props;
      },
    };
    const y = {
      getY() {
        return "y";
      },
    };
    t0 = setProperty(x, y);
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":{"getX":{"kind":"Function","result":{"value":0}},"wat0":{"getY":{"kind":"Function","result":"y"}}},"shouldInvokeFns":true}</div>