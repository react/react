
## Input

```javascript
import {useReducer} from 'react';

function f() {
  const [state, dispatch] = useReducer();

  const onClick = () => {
    dispatch();
  };

  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: [],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useReducer } from "react";

function f() {
  const $ = _c(1);
  const [, dispatch] = useReducer();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const onClick = () => {
      dispatch();
    };
    t0 = <div onClick={onClick} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: [],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div></div>