
## Input

```javascript
// JSX variant of try-catch-unreachable-catch-reassigns-binding: the pruned
// catch conditionally reassigns `n`, leaving a phi operand from a removed
// block in the join after the try/catch. The component must still render.
function Component(props) {
  let n = 0;
  try {
    const x = 1;
  } catch (e) {
    if (e) {
      n = 1;
    }
  }
  n = n + 1;
  return <div>{n}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // JSX variant of try-catch-unreachable-catch-reassigns-binding: the pruned
// catch conditionally reassigns `n`, leaving a phi operand from a removed
// block in the join after the try/catch. The component must still render.
function Component(props) {
  const $ = _c(1);
  let n = 0;

  n = n + 1;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>{n}</div>;
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div>1</div>