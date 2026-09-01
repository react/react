
## Input

```javascript
import {identity, mutate, mutateAndReturn} from 'shared-runtime';

function Component(props) {
  const key = {};
  const context = {
    [(mutate(key), key)]: identity([props.value]),
  };
  mutate(key);
  return [context, key];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
  sequentialRenders: [{value: 42}, {value: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, mutate, mutateAndReturn } from "shared-runtime";

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.value) {
    const key = {};
    const context = { [(mutate(key), key)]: identity([props.value]) };
    mutate(key);
    t0 = [context, key];
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
  sequentialRenders: [{ value: 42 }, { value: 42 }],
};

```
      
### Eval output
(kind: ok) [{"[object Object]":[42]},{"wat0":"joe","wat1":"joe"}]
[{"[object Object]":[42]},{"wat0":"joe","wat1":"joe"}]