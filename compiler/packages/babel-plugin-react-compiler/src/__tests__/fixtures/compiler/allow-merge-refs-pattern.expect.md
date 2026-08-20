
## Input

```javascript
// @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const ref2 = useRef(null);
  const mergedRef = mergeRefs([ref], ref2);

  return <Stringify ref={mergedRef} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender

import { useRef } from "react";

function Component() {
  const $ = _c(1);
  const ref = useRef(null);
  const ref2 = useRef(null);
  const mergedRef = mergeRefs([ref], ref2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Stringify ref={mergedRef} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented