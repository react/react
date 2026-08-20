
## Input

```javascript
function Component(props) {
  const items = [];

  for (let i = 0, length = props.items.length; i < length; i++) {
    items.push(props.items[i]);
  }

  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: ['a', 'b', 42]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let items;
  if ($[0] !== props.items) {
    items = [];

    for (let i = 0, length = props.items.length; i < length; i++) {
      items.push(props.items[i]);
    }
    $[0] = props.items;
    $[1] = items;
  } else {
    items = $[1];
  }

  return items;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ items: ["a", "b", 42] }],
};

```
      
### Eval output
(kind: ok) ["a","b",42]