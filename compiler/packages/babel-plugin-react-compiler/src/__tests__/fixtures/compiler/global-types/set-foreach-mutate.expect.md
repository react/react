
## Input

```javascript
import {mutateAndReturn, Stringify, useIdentity} from 'shared-runtime';

function Component({value}) {
  const arr = [{value: 'foo'}, {value: 'bar'}, {value}];
  useIdentity();
  const derived = new Set(arr).forEach(mutateAndReturn);
  return <Stringify>{[...derived]}</Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 5}],
  sequentialRenders: [{value: 5}, {value: 6}, {value: 6}, {value: 7}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { mutateAndReturn, Stringify, useIdentity } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { value } = t0;
  const arr = [{ value: "foo" }, { value: "bar" }, { value }];
  useIdentity();
  const derived = new Set(arr).forEach(mutateAndReturn);
  let t1;
  if ($[0] !== derived) {
    t1 = <Stringify>{[...derived]}</Stringify>;
    $[0] = derived;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 5 }],
  sequentialRenders: [{ value: 5 }, { value: 6 }, { value: 6 }, { value: 7 }],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: derived is not iterable ]]
[[ (exception in render) TypeError: derived is not iterable ]]
[[ (exception in render) TypeError: derived is not iterable ]]
[[ (exception in render) TypeError: derived is not iterable ]]