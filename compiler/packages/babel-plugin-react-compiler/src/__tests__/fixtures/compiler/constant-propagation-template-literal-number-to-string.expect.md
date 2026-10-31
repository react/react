
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  return (
    <Stringify
      value={[
        `${2 ** 55}`,
        `${2 ** 60}`,
        `${-(2 ** 62)}`,
        `${2 ** -25}`,
        `${1000000000000000.25}`,
        `${2 ** 53}`,
        `${0.1}`,
        `${1e21}`,
        `${1e-7}`,
        `${123.456}`,
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
          "36028797018963970",
          "1152921504606847000",
          "-4611686018427388000",
          "2.9802322387695312e-8",
          "1000000000000000.2",
          "9007199254740992",
          "0.1",
          "1e+21",
          "1e-7",
          "123.456",
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
(kind: ok) <div>{"value":["36028797018963970","1152921504606847000","-4611686018427388000","2.9802322387695312e-8","1000000000000000.2","9007199254740992","0.1","1e+21","1e-7","123.456"]}</div>