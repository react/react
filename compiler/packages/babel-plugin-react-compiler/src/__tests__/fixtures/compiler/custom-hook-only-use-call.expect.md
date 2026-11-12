
## Input

```javascript
// @compilationMode:"infer"
import {use} from 'react';

function useThing(Ctx) {
  const v = use(Ctx);
  return {v, w: [v.x]};
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode:"infer"
import { use } from "react";

function useThing(Ctx) {
  const $ = _c(5);
  const v = use(Ctx);
  let t0;
  if ($[0] !== v.x) {
    t0 = [v.x];
    $[0] = v.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0 || $[3] !== v) {
    t1 = { v, w: t0 };
    $[2] = t0;
    $[3] = v;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented