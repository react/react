
## Input

```javascript
// @enableForest @enableEmitHookGuards
import {useState} from 'react';

function Component({initial}) {
  const [count, setCount] = useState(initial);
  return <div onClick={() => setCount(count + 1)}>{count}</div>;
}

```

## Code

```javascript
import { $dispatcherGuard } from "react-compiler-runtime";
import { c as _c } from "react/compiler-runtime"; // @enableForest @enableEmitHookGuards
import { useState } from "react";

function Component(t0) {
  const $ = _c(2);
  try {
    $dispatcherGuard(0);
    const { initial } = t0;
    const [count, setCount] = useState(initial);
    let t1;
    if ($[0] !== count) {
      t1 = () => setCount(count + 1);
      $[0] = count;
      $[1] = t1;
    } else {
      t1 = $[1];
    }
    return <div onClick={t1}>{count}</div>;
  } finally {
    $dispatcherGuard(1);
  }
}

```
      
### Eval output
(kind: exception) Fixture not implemented