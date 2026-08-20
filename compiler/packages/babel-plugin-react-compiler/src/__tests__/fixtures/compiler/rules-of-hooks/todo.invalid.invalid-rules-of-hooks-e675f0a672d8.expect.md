
## Input

```javascript
// @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function renderItem() {
  useState();
}

function List(props) {
  return props.items.map(renderItem);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function renderItem() {
  useState();
}

function List(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(renderItem);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      