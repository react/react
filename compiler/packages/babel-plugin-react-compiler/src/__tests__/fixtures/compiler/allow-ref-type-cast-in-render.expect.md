
## Input

```javascript
import {useRef} from 'react';

function useArrayOfRef() {
  const ref = useRef(null);
  const callback = value => {
    ref.current = value;
  };
  return [callback] as const;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => {
    useArrayOfRef();
    return 'ok';
  },
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";

function useArrayOfRef() {
  const $ = _c(1);
  const ref = useRef(null);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const callback = (value) => {
      ref.current = value;
    };
    t0 = [callback];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0 as const;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => {
    useArrayOfRef();
    return "ok";
  },

  params: [{}],
};

```
      
### Eval output
(kind: ok) "ok"