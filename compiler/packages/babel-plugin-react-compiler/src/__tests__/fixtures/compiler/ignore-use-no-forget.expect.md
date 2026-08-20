
## Input

```javascript
// @ignoreUseNoForget
function Component(prop) {
  'use no forget';
  const result = prop.x.toFixed();
  return <div>{result}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @ignoreUseNoForget
function Component(prop) {
  "use no forget";
  const $ = _c(4);
  let t0;
  if ($[0] !== prop.x) {
    t0 = prop.x.toFixed();
    $[0] = prop.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const result = t0;
  let t1;
  if ($[2] !== result) {
    t1 = <div>{result}</div>;
    $[2] = result;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: 1 }],
};

```
      
### Eval output
(kind: ok) <div>1</div>