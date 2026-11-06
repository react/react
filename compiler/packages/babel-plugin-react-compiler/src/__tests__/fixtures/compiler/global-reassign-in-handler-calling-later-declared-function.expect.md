
## Input

```javascript
let counter = 0;

function Component() {
  function press() {
    counter = counter + 1;
    later();
  }
  function later() {}
  return <button onClick={press} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
let counter = 0;

function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const press = function press() {
      counter = counter + 1;
      later();
    };
    function later() {}
    t0 = <button onClick={press} />;
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
(kind: ok) <button></button>