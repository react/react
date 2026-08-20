
## Input

```javascript
import {createHookWrapper, CONST_STRING0, CONST_STRING1} from 'shared-runtime';

function useHook({value}) {
  return {
    getValue() {
      return identity(value);
    },
  }
    ? CONST_STRING0
    : CONST_STRING1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{value: 0}],
};

```

## Code

```javascript
import {
  createHookWrapper,
  CONST_STRING0,
  CONST_STRING1,
} from "shared-runtime";

function useHook(t0) {
  const { value } = t0;
  return {
    getValue() {
      return identity(value);
    },
  }
    ? CONST_STRING0
    : CONST_STRING1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useHook),
  params: [{ value: 0 }],
};

```
      
### Eval output
(kind: ok) <div>{"result":"global string 0","shouldInvokeFns":true}</div>