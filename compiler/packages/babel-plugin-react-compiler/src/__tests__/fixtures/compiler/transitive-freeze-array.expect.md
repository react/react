
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees
const {mutate} = require('shared-runtime');

function Component(props) {
  const x = {};
  const y = {};
  const items = [x, y];
  items.pop();
  <div>{items}</div>; // note: enablePreserveExistingMemoizationGuarantees only visits function expressions, not arrays, so this doesn't freeze x/y
  mutate(y); // ok! not part of `items` anymore bc of items.pop()
  return [x, y, items];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees
const { mutate } = require("shared-runtime");

function Component(props) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = {};
    const y = {};
    const items = [x, y];
    items.pop();
    mutate(y);
    t0 = [x, y, items];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [{},{"wat0":"joe"},["[[ cyclic ref *1 ]]"]]