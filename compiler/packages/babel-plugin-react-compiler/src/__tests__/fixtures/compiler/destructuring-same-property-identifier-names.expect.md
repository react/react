
## Input

```javascript
import {identity} from 'shared-runtime';

function Component(props) {
  const {
    x: {destructured},
    sameName: renamed,
  } = props;
  const sameName = identity(destructured);

  return [sameName, renamed];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: {destructured: 0}, sameName: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function Component(props) {
  const $ = _c(5);
  const { x: t0, sameName: renamed } = props;
  const { destructured } = t0;
  let t1;
  if ($[0] !== destructured) {
    t1 = identity(destructured);
    $[0] = destructured;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const sameName = t1;
  let t2;
  if ($[2] !== renamed || $[3] !== sameName) {
    t2 = [sameName, renamed];
    $[2] = renamed;
    $[3] = sameName;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ x: { destructured: 0 }, sameName: 2 }],
};

```
      
### Eval output
(kind: ok) [0,2]