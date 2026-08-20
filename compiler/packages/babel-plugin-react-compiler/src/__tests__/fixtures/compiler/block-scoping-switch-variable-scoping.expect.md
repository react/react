
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component(props) {
  const outerHandlers = useMemo(() => {
    let handlers = {value: props.value};
    switch (props.test) {
      case true: {
        console.log(handlers.value);
        break;
      }
      default: {
      }
    }
    return handlers;
  });
  return outerHandlers;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: true, value: 'hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.value) {
    t0 = { value: props.value };
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const handlers = t0;
  bb0: switch (props.test) {
    case true: {
      console.log(handlers.value);
      break bb0;
    }
    default:
  }
  const outerHandlers = handlers;

  return outerHandlers;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ test: true, value: "hello" }],
};

```
      
### Eval output
(kind: ok) {"value":"hello"}
logs: ['hello']