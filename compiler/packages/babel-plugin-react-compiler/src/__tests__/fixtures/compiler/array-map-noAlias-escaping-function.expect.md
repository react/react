
## Input

```javascript
function Component(props) {
  const f = item => item;
  const x = [...props.items].map(f); // `f` doesn't escape here...
  return [x, f]; // ...but it does here so it's memoized
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{id: 1}]}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const f = _temp;
  let t0;
  if ($[0] !== props.items) {
    const x = [...props.items].map(f);
    t0 = [x, f];
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(item) {
  return item;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: [{ id: 1 }] }],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [[{"id":1}],"[[ function params=1 ]]"]