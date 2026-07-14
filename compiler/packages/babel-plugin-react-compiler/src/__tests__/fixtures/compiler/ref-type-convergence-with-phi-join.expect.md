
## Input

```javascript
// When phi nodes join Ref types with different ref_ids, the join creates a
// fresh ref_id. The fixpoint equality check must ignore ref_ids on Ref and
// RefValue variants (matching TS tyEqual semantics) so the environment
// stabilizes. Without this, the analysis never converges.

import {useRef} from 'react';

function Component({cond}) {
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const chosen = cond ? ref1 : ref2;
  return <div ref={chosen} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // When phi nodes join Ref types with different ref_ids, the join creates a
// fresh ref_id. The fixpoint equality check must ignore ref_ids on Ref and
// RefValue variants (matching TS tyEqual semantics) so the environment
// stabilizes. Without this, the analysis never converges.

import { useRef } from "react";

function Component(t0) {
  const $ = _c(2);
  const { cond } = t0;
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const chosen = cond ? ref1 : ref2;
  let t1;
  if ($[0] !== chosen) {
    t1 = <div ref={chosen} />;
    $[0] = chosen;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) <div></div>