
## Input

```javascript
const {mutate} = require('shared-runtime');

function component(foo, bar) {
  let x = {foo};
  let y = {bar};
  (function () {
    let a = {y};
    let b = x;
    a.x = b;
  })();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['foo', 'bar'],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
const { mutate } = require("shared-runtime");

function component(foo, bar) {
  const $ = _c(3);
  let y;
  if ($[0] !== bar || $[1] !== foo) {
    const x = { foo };
    y = { bar };

    const a = { y };
    const b = x;
    a.x = b;

    mutate(y);
    $[0] = bar;
    $[1] = foo;
    $[2] = y;
  } else {
    y = $[2];
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["foo", "bar"],
};

```
      
### Eval output
(kind: ok) {"bar":"bar","wat0":"joe"}