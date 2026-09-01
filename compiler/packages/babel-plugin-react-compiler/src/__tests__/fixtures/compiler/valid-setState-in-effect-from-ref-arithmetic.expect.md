
## Input

```javascript
// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @outputMode:"lint"
import {useState, useRef, useLayoutEffect} from 'react';

function Component() {
  const ref = useRef({size: 5});
  const [computedSize, setComputedSize] = useState(0);

  useLayoutEffect(() => {
    setComputedSize(ref.current.size * 10);
  }, []);

  return computedSize;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// @validateNoSetStateInEffects @enableAllowSetStateFromRefsInEffects @outputMode:"lint"
import { useState, useRef, useLayoutEffect } from "react";

function Component() {
  const ref = useRef({ size: 5 });
  const [computedSize, setComputedSize] = useState(0);

  useLayoutEffect(() => {
    setComputedSize(ref.current.size * 10);
  }, []);

  return computedSize;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) 50