
## Input

```javascript
function Component(props) {
  const items = bar();
  mutate(items.a, props.a);

  const count = foo(items.length + 1);

  return {items, count};
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(7);
  let items;
  if ($[0] !== props.a) {
    items = bar();
    mutate(items.a, props.a);
    $[0] = props.a;
    $[1] = items;
  } else {
    items = $[1];
  }

  const t0 = items.length + 1;
  let t1;
  if ($[2] !== t0) {
    t1 = foo(t0);
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const count = t1;
  let t2;
  if ($[4] !== count || $[5] !== items) {
    t2 = { items, count };
    $[4] = count;
    $[5] = items;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

```
      