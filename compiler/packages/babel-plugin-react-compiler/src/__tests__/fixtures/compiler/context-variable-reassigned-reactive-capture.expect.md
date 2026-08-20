
## Input

```javascript
import {invoke} from 'shared-runtime';

function Component({value}) {
  let x = null;
  const reassign = () => {
    x = value;
  };
  invoke(reassign);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 2}],
  sequentialRenders: [{value: 2}, {value: 4}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { invoke } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { value } = t0;
  let x;
  if ($[0] !== value) {
    x = null;
    const reassign = () => {
      x = value;
    };

    invoke(reassign);
    $[0] = value;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 2 }],
  sequentialRenders: [{ value: 2 }, { value: 4 }],
};

```
      
### Eval output
(kind: ok) 2
4