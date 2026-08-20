
## Input

```javascript
// @enablePropagateDepsInHIR
function Component(props) {
  const x = [];
  x.push(props.items?.length);
  x.push(props.items?.edges?.map?.(render)?.filter?.(Boolean) ?? []);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: {edges: null, length: 0}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
function Component(props) {
  const $ = _c(5);
  let x;
  if ($[0] !== props.items?.edges || $[1] !== props.items?.length) {
    x = [];
    x.push(props.items?.length);
    let t0;
    if ($[3] !== props.items?.edges) {
      t0 = props.items?.edges?.map?.(render)?.filter?.(Boolean) ?? [];
      $[3] = props.items?.edges;
      $[4] = t0;
    } else {
      t0 = $[4];
    }
    x.push(t0);
    $[0] = props.items?.edges;
    $[1] = props.items?.length;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: { edges: null, length: 0 } }],
};

```
      
### Eval output
(kind: ok) [0,[]]