
## Input

```javascript
import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */
function Component({cond}) {
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  const cb = () => ref.current;
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef } from "react";
import { Stringify } from "shared-runtime";

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */
function Component(t0) {
  const $ = _c(2);
  const { cond } = t0;
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  let t1;
  if ($[0] !== ref) {
    const cb = () => ref.current;
    t1 = <Stringify cb={cb} shouldInvokeFns={true} />;
    $[0] = ref;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true }],
  sequentialRenders: [{ cond: true }, { cond: false }],
};

```
      
### Eval output
(kind: ok) <div>{"cb":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"cb":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>