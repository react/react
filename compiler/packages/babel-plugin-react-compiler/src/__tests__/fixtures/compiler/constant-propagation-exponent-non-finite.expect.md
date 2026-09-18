
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        1 ** (0 / 0),
        1 ** (1 / 0),
        1 ** (-1 / 0),
        (-1) ** (1 / 0),
        (-1) ** (-1 / 0),
        (-1) ** (0 / 0),
        (0 / 0) ** 0,
        2 ** (1 / 0),
        0.5 ** (1 / 0),
        2 ** 10,
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
      <Stringify value={[NaN, NaN, NaN, NaN, NaN, NaN, 1, Infinity, 0, 1024]} />
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
(kind: ok) <div>{"value":[null,null,null,null,null,null,1,null,0,1024]}</div>