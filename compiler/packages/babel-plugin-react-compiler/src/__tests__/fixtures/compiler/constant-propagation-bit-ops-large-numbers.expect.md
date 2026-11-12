
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        (2 ** 64) | 0,
        -(2 ** 64) | 0,
        1e21 | 0,
        -1e21 | 0,
        1e21 & -1,
        1e21 ^ 0,
        1e21 >>> 0,
        (2 ** 64) >> 4,
        1e21 << 1,
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
          0, 0, -559939584, 559939584, -559939584, -559939584, 3735027712, 0,
          -1119879168,
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
(kind: ok) <div>{"value":[0,0,-559939584,559939584,-559939584,-559939584,3735027712,0,-1119879168]}</div>