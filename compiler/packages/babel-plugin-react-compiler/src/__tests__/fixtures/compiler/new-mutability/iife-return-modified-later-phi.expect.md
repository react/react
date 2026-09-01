
## Input

```javascript
function Component(props) {
  const items = (() => {
    if (props.cond) {
      return [];
    } else {
      return null;
    }
  })();
  items?.push(props.a);
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(3);
  let items;
  if ($[0] !== props.a || $[1] !== props.cond) {
    let t0;
    if (props.cond) {
      t0 = [];
    } else {
      t0 = null;
    }
    items = t0;

    items?.push(props.a);
    $[0] = props.a;
    $[1] = props.cond;
    $[2] = items;
  } else {
    items = $[2];
  }
  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: {} }],
};

```
      
### Eval output
(kind: ok) null