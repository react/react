
## Input

```javascript
import {useRef} from 'react';

export function useSomething() {
  return {a: useRef(0)};
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from 'react';
export function useSomething() {
  const $ = _c(1);
  const t0 = useRef(0);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      a: t0
    };
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}
```
      
