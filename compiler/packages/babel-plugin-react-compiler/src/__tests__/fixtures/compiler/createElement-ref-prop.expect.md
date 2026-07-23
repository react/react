
## Input

```javascript
import React, {useRef} from 'react';

function refInHtmlElement() {
  const ref = useRef(null);
  return React.createElement('canvas', {ref});
}

export const FIXTURE_ENTRYPOINT = {
  fn: refInHtmlElement,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import React, { useRef } from "react";

function refInHtmlElement() {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = React.createElement("canvas", { ref });
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: refInHtmlElement,
  params: [],
};

```
      
### Eval output
(kind: ok) <canvas></canvas>