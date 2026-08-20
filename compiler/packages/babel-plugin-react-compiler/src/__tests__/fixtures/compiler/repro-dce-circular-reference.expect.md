
## Input

```javascript
import {identity} from 'shared-runtime';

function Component({data}) {
  let x = 0;
  for (const item of data) {
    const {current, other} = item;
    x += current;
    identity(other);
  }
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      data: [
        {current: 2, other: 3},
        {current: 4, other: 5},
      ],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(t0) {
  const $ = _c(2);
  const { data } = t0;
  let x = 0;
  for (const item of data) {
    const { current, other } = item;
    x = x + current;
    identity(other);
  }
  let t1;
  if ($[0] !== x) {
    t1 = [x];
    $[0] = x;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      data: [
        { current: 2, other: 3 },
        { current: 4, other: 5 },
      ],
    },
  ],
};

```
      
### Eval output
(kind: ok) [6]