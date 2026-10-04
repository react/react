
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
const {identity, mutate} = require('shared-runtime');

function Component(props) {
  let x;
  const object = {...props.value};
  for (const y in object) {
    x = y;
  }
  mutate(x); // can't modify, x is known primitive!
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 'a', b: 'B', c: 'C!'}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePreserveExistingMemoizationGuarantees:false
const { identity, mutate } = require("shared-runtime");

function Component(props) {
  const $ = _c(2);
  let x;
  if ($[0] !== props.value) {
    const object = { ...props.value };
    for (const y in object) {
      x = y;
    }
    $[0] = props.value;
    $[1] = x;
  } else {
    x = $[1];
  }

  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: { a: "a", b: "B", c: "C!" } }],
};

```
      
### Eval output
(kind: ok) "c"