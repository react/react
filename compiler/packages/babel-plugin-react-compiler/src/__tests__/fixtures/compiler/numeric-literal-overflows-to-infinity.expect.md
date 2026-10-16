
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  const big = 1e999;
  const keys = {1e999: 'a', 1e21: 'b', 1.5e-7: 'c'};
  return (
    <Stringify
      value={[
        big,
        -1e999,
        1e999 > Number.MAX_VALUE,
        `${1e999}`,
        Object.keys(keys),
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
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { Infinity: "a", 1e21: "b", 1.5e-7: "c" };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const keys = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = (
      <Stringify
        value={[
          Infinity,

          -Infinity,
          Infinity > Number.MAX_VALUE,
          "Infinity",
          Object.keys(keys),
        ]}
      />
    );
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) <div>{"value":[null,null,true,"Infinity",["Infinity","1e+21","1.5e-7"]]}</div>