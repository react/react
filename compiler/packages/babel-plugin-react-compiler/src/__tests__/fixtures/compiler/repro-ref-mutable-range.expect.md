
## Input

```javascript
import {Stringify, identity, mutate, CONST_TRUE} from 'shared-runtime';

function Foo(props, ref) {
  const value = {};
  if (CONST_TRUE) {
    mutate(value);
    return <Stringify ref={ref} />;
  }
  mutate(value);
  if (CONST_TRUE) {
    return <Stringify ref={identity(ref)} />;
  }
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}, {current: 'fake-ref-object'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, identity, mutate, CONST_TRUE } from "shared-runtime";

function Foo(props, ref) {
  const $ = _c(7);
  let t0;
  let value;
  if ($[0] !== ref) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      value = {};
      if (CONST_TRUE) {
        mutate(value);
        t0 = <Stringify ref={ref} />;
        break bb0;
      }

      mutate(value);
    }
    $[0] = ref;
    $[1] = t0;
    $[2] = value;
  } else {
    t0 = $[1];
    value = $[2];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  if (CONST_TRUE) {
    let t1;
    if ($[3] !== ref) {
      t1 = identity(ref);
      $[3] = ref;
      $[4] = t1;
    } else {
      t1 = $[4];
    }
    let t2;
    if ($[5] !== t1) {
      t2 = <Stringify ref={t1} />;
      $[5] = t1;
      $[6] = t2;
    } else {
      t2 = $[6];
    }
    return t2;
  }

  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}, { current: "fake-ref-object" }],
};

```
      
### Eval output
(kind: ok) <div>{"ref":{"current":"fake-ref-object"}}</div>