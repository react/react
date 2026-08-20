
## Input

```javascript
import {useEffect, useRef} from 'react';

function Component(props) {
  const ref = useRef();
  useFoo(() => {
    ref.current = 42;
  });
}

function useFoo(x) {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect, useRef } from "react";

function Component(props) {
  const $ = _c(1);
  const ref = useRef();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      ref.current = 42;
    };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useFoo(t0);
}

function useFoo(x) {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) 