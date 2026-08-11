
## Input

```javascript
import {useMemo as myMemo} from 'react';

function Component({x}) {
  const v = myMemo(() => x * 2, [x]);
  return <div>{v}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo as myMemo } from "react";

function Component(t0) {
  const $ = _c(2);
  const { x } = t0;
  const v = x * 2;
  let t1;
  if ($[0] !== v) {
    t1 = <div>{v}</div>;
    $[0] = v;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented