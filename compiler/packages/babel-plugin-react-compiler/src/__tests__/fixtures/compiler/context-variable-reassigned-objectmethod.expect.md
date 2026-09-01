
## Input

```javascript
import {invoke} from 'shared-runtime';

function Component({cond}) {
  let x = 2;
  const obj = {
    method(cond) {
      if (cond) {
        x = 4;
      }
    },
  };
  invoke(obj.method, cond);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { invoke } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { cond } = t0;
  let x;
  if ($[0] !== cond) {
    x = 2;
    const obj = {
      method(cond_0) {
        if (cond_0) {
          x = 4;
        }
      },
    };
    invoke(obj.method, cond);
    $[0] = cond;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) 4