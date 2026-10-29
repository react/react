
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new MutationObserver(() => ref.current);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender
import { useRef } from "react";

function useObserver() {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new MutationObserver(() => ref.current);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented