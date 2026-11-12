
## Input

```javascript
// @outputMode:"ssr"
import {useReducer} from 'react';

function Counter({count, dispatch}) {
  return (
    <div>
      {count} {typeof dispatch}
    </div>
  );
}

function Component() {
  // The dispatch function is passed to a child, so the state is not inlined
  const [count, dispatch] = useReducer((current, delta) => current + delta, 0);
  return <Counter count={count} dispatch={dispatch} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
// @outputMode:"ssr"
import { useReducer } from "react";

function Counter(t0) {
  const { count, dispatch } = t0;
  return (
    <div>
      {count} {typeof dispatch}
    </div>
  );
}

function Component() {
  const [count, dispatch] = useReducer(_temp, 0);
  return <Counter count={count} dispatch={dispatch} />;
}
function _temp(current, delta) {
  return current + delta;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>0 function</div>