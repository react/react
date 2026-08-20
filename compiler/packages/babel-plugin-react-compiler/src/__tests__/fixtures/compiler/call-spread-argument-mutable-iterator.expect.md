
## Input

```javascript
import {useIdentity} from 'shared-runtime';

function useFoo() {
  const it = new Set([1, 2]).values();
  useIdentity();
  return Math.max(...it);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { useIdentity } from "shared-runtime";

function useFoo() {
  const it = new Set([1, 2]).values();
  useIdentity();
  return Math.max(...it);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) 2
2