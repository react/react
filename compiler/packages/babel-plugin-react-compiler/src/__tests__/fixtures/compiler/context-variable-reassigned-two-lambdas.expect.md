
## Input

```javascript
import {conditionalInvoke} from 'shared-runtime';

function Component({doReassign1, doReassign2}) {
  let x = {};
  const reassign1 = () => {
    x = 2;
  };
  const reassign2 = () => {
    x = 3;
  };
  conditionalInvoke(doReassign1, reassign1);
  conditionalInvoke(doReassign2, reassign2);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{doReassign1: true, doReassign2: true}],
  sequentialRenders: [
    {doReassign1: true, doReassign2: true},
    {doReassign1: true, doReassign2: false},
    {doReassign1: false, doReassign2: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { conditionalInvoke } from "shared-runtime";

function Component(t0) {
  const $ = _c(3);
  const { doReassign1, doReassign2 } = t0;
  let x;
  if ($[0] !== doReassign1 || $[1] !== doReassign2) {
    x = {};
    const reassign1 = () => {
      x = 2;
    };

    const reassign2 = () => {
      x = 3;
    };

    conditionalInvoke(doReassign1, reassign1);
    conditionalInvoke(doReassign2, reassign2);
    $[0] = doReassign1;
    $[1] = doReassign2;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ doReassign1: true, doReassign2: true }],
  sequentialRenders: [
    { doReassign1: true, doReassign2: true },
    { doReassign1: true, doReassign2: false },
    { doReassign1: false, doReassign2: false },
  ],
};

```
      
### Eval output
(kind: ok) 3
2
{}