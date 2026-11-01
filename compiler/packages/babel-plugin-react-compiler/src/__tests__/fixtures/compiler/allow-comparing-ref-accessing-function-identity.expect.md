
## Input

```javascript
import {useCallback, useRef} from 'react';

function Component({other}) {
  const ref = useRef(0);
  const sampleFunc = useCallback(() => {
    ref.current += 1;
    return ref.current;
  }, []);

  // Merely comparing function identity never invokes `sampleFunc`, so this
  // must not be treated as a ref access even though `sampleFunc` reads a ref
  // when called.
  return sampleFunc !== other ? 'different' : 'same';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{other: null}],
};

```

## Code

```javascript
import { useCallback, useRef } from "react";

function Component(t0) {
  const { other } = t0;
  const ref = useRef(0);
  const sampleFunc = () => {
    ref.current = ref.current + 1;
    return ref.current;
  };

  return sampleFunc !== other ? "different" : "same";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ other: null }],
};

```
      
### Eval output
(kind: ok) "different"