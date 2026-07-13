
## Input

```javascript
import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const key = {a: 'key'};
  const context = {
    [key.a]: identity([props.value]),
  };
  mutate(key);
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, mutate, mutateAndReturn } from "shared-runtime";

function Component(props) {
  const $ = _c(4);
  let context;
  if ($[0] !== props.value) {
    const key = { a: "key" };
    const t0 = key.a;
    const t1 = identity([props.value]);
    let t2;
    if ($[2] !== t1) {
      t2 = { [t0]: t1 };
      $[2] = t1;
      $[3] = t2;
    } else {
      t2 = $[3];
    }
    context = t2;
    mutate(key);
    $[0] = props.value;
    $[1] = context;
  } else {
    context = $[1];
  }
  return context;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) {"key":[42]}