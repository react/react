
## Input

```javascript
/**
 * This is a weird case as data has type `BuiltInMixedReadonly`.
 * The only scoped value we currently infer in this program is the
 * PropertyLoad `data?.toString`.
 */
import {useFragment} from 'shared-runtime';

function Foo() {
  const data = useFragment();
  return [data?.toString() || ''];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * This is a weird case as data has type `BuiltInMixedReadonly`.
 * The only scoped value we currently infer in this program is the
 * PropertyLoad `data?.toString`.
 */
import { useFragment } from "shared-runtime";

function Foo() {
  const $ = _c(4);
  const data = useFragment();
  let t0;
  if ($[0] !== data) {
    t0 = data?.toString() || "";
    $[0] = data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = [t0];
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) ["[object Object]"]