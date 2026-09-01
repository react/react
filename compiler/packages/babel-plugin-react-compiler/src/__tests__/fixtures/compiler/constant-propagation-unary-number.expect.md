
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  const a = -1;
  return (
    <Stringify
      value={[
        2 * a,
        -0,
        0 === -0,
        -Infinity,
        -NaN,
        a * NaN,
        a * Infinity,
        a * -Infinity,
      ]}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <Stringify
        value={[
          -2,
          0,
          true,
          -Infinity,
          -NaN,
          -1 * NaN,
          -1 * Infinity,
          -1 * -Infinity,
        ]}
      />
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) <div>{"value":[-2,0,true,null,null,null,null,null]}</div>