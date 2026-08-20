
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        123.45 | 0,
        123.45 & 0,
        123.45 ^ 0,
        123 << 0,
        123 >> 0,
        123 >>> 0,
        123.45 | 1,
        123.45 & 1,
        123.45 ^ 1,
        123 << 1,
        123 >> 1,
        123 >>> 1,
        3 ** 2,
        3 ** 2.5,
        3.5 ** 2,
        2 ** (3 ** 0.5),
        4 % 2,
        4 % 2.5,
        4 % 3,
        4.5 % 2,
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
          123, 0, 123, 123, 123, 123, 123, 1, 122, 246, 61, 61, 9,
          15.588457268119896, 12.25, 3.3219970854839125, 0, 1.5, 1, 0.5,
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
(kind: ok) <div>{"value":[123,0,123,123,123,123,123,1,122,246,61,61,9,15.588457268119896,12.25,3.3219970854839125,0,1.5,1,0.5]}</div>