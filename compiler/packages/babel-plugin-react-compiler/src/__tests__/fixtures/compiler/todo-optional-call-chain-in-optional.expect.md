
## Input

```javascript
function useFoo(props: {value: {x: string; y: string} | null}) {
  const value = props.value;
  return createArray(value?.x, value?.y)?.join(', ');
}

function createArray<T>(...args: Array<T>): Array<T> {
  return args;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{value: null}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo(props) {
  const $ = _c(3);
  const value = props.value;
  let t0;
  if ($[0] !== value?.x || $[1] !== value?.y) {
    t0 = createArray(value?.x, value?.y)?.join(", ");
    $[0] = value?.x;
    $[1] = value?.y;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

function createArray(...t0) {
  const args = t0;
  return args;
}

export const FIXTURE_ENTRYPONT = {
  fn: useFoo,
  props: [{ value: null }],
};

```
      
### Eval output
(kind: exception) Fixture not implemented