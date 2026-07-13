
## Input

```javascript
import {CONST_NUMBER0, invoke} from 'shared-runtime';

function Foo() {
  const x = [{value: 0}, {value: 1}, {value: 2}];
  const param = CONST_NUMBER0;
  const foo = () => {
    return x[param].value;
  };

  return invoke(foo);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { CONST_NUMBER0, invoke } from "shared-runtime";

function Foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = [{ value: 0 }, { value: 1 }, { value: 2 }];
    const foo = () => x[CONST_NUMBER0].value;
    t0 = invoke(foo);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) 0