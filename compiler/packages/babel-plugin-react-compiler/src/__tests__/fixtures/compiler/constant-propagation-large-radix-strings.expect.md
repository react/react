
## Input

```javascript
import {Stringify} from 'shared-runtime';

function foo() {
  const maxFinite =
    '0xfffffffffffff800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const belowOverflowMidpoint =
    '0xfffffffffffffbffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const overflowMidpoint =
    '0xfffffffffffffc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const overflow =
    '0x1' +
    '0000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000' +
    '0000000000000000000000000000000000000000000000000000000000000000';
  return (
    <Stringify
      value={[
        '0x10000000000000000' == 18446744073709551616,
        '0o2000000000000000000000' == 18446744073709551616,
        '0b10000000000000000000000000000000000000000000000000000000000000000' ==
          18446744073709551616,
        '0x20000000000001' == 9007199254740992,
        '0x20000000000003' == 9007199254740996,
        '0x40000000000003' == 18014398509481988,
        '0x3fffffffffffff' == 18014398509481984,
        maxFinite == 1.7976931348623157e308,
        belowOverflowMidpoint == 1.7976931348623157e308,
        overflowMidpoint == 1 / 0,
        overflow == 1 / 0,
        overflow + 'g' == 1 / 0,
        '0x' == 0,
        '0b2' == 2,
        'inf' == 1 / 0,
        'infinity' == 1 / 0,
        'INFINITY' == 1 / 0,
        '-inf' == -1 / 0,
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
          true,
          true,
          true,

          true,
          true,
          true,
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
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
(kind: ok) <div>{"value":[true,true,true,true,true,true,true,true,true,true,true,false,false,false,false,false,false,false]}</div>