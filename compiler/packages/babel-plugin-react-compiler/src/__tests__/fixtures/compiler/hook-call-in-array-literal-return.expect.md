
## Input

```javascript
import {useRef} from 'react';

export function useTuple() {
  return [useRef(null)];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from 'react';
export function useTuple() {
  const $ = _c(1);
  const t0 = useRef(null);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [t0];
    $[0] = t1;
  } else {
    t1 = $[0];
  }
  return t1;
}
```
      
