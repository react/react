
## Input

```javascript
// @enableNewMutationAliasingModel
function Component(props) {
  // This item is part of the receiver, should be memoized
  const item = {a: props.a};
  const items = [item];
  const mapped = items.map(item => item);
  // mapped[0].a = null;
  return mapped;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {id: 42}}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.a) {
    const item = { a: props.a };
    const items = [item];
    t0 = items.map(_temp);
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const mapped = t0;

  return mapped;
}
function _temp(item_0) {
  return item_0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: { id: 42 } }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [{"a":{"id":42}}]