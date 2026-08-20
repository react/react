
## Input

```javascript
import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const obj = {mutateAndReturn};
  const key = {};
  const context = {
    [obj.mutateAndReturn(key)]: identity([props.value]),
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
  const $ = _c(2);
  let context;
  if ($[0] !== props.value) {
    const obj = { mutateAndReturn };
    const key = {};
    context = { [obj.mutateAndReturn(key)]: identity([props.value]) };
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
(kind: ok) {"[object Object]":[42]}