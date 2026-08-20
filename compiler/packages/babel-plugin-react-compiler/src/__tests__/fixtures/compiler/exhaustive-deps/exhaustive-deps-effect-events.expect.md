
## Input

```javascript
// @validateExhaustiveEffectDependencies:"all"
import {useEffect, useEffectEvent} from 'react';

function Component({x, y, z}) {
  const effectEvent = useEffectEvent(() => {
    log(x);
  });

  const effectEvent2 = useEffectEvent(z => {
    log(y, z);
  });

  // ok - effectEvent not included in deps
  useEffect(() => {
    effectEvent();
  }, []);

  // ok - effectEvent2 not included in deps, z included
  useEffect(() => {
    effectEvent2(z);
  }, [z]);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateExhaustiveEffectDependencies:"all"
import { useEffect, useEffectEvent } from "react";

function Component(t0) {
  const $ = _c(12);
  const { x, y, z } = t0;
  let t1;
  if ($[0] !== x) {
    t1 = () => {
      log(x);
    };
    $[0] = x;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const effectEvent = useEffectEvent(t1);
  let t2;
  if ($[2] !== y) {
    t2 = (z_0) => {
      log(y, z_0);
    };
    $[2] = y;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const effectEvent2 = useEffectEvent(t2);
  let t3;
  if ($[4] !== effectEvent) {
    t3 = () => {
      effectEvent();
    };
    $[4] = effectEvent;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [];
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  useEffect(t3, t4);
  let t5;
  if ($[7] !== effectEvent2 || $[8] !== z) {
    t5 = () => {
      effectEvent2(z);
    };
    $[7] = effectEvent2;
    $[8] = z;
    $[9] = t5;
  } else {
    t5 = $[9];
  }
  let t6;
  if ($[10] !== z) {
    t6 = [z];
    $[10] = z;
    $[11] = t6;
  } else {
    t6 = $[11];
  }
  useEffect(t5, t6);
}

```
      
### Eval output
(kind: exception) Fixture not implemented