
## Input

```javascript
import {useRef} from 'react';

export function Component() {
  const 한글Ref = useRef(0);
  return (
    <div
      onClick={() => {
        한글Ref.current += 1;
      }}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";

export function Component() {
  const $ = _c(1);
  const 한글Ref = useRef(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <div
        onClick={() => {
          한글Ref.current = 한글Ref.current + 1;
        }}
      />
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div></div>