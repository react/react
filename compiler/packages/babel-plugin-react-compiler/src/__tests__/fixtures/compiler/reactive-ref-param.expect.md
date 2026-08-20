
## Input

```javascript
import {useRef, forwardRef} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */

function Parent({cond}) {
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  return <Child ref={ref} />;
}

function ChildImpl(_props, ref) {
  const cb = () => ref.current;
  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

const Child = forwardRef(ChildImpl);

export const FIXTURE_ENTRYPOINT = {
  fn: Parent,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useRef, forwardRef } from "react";
import { Stringify } from "shared-runtime";

/**
 * Fixture showing that Ref types may be reactive.
 * We should always take a dependency on ref values (the outer box) as
 * they may be reactive. Pruning should be done in
 * `pruneNonReactiveDependencies`
 */

function Parent(t0) {
  const $ = _c(2);
  const { cond } = t0;
  const ref1 = useRef(1);
  const ref2 = useRef(2);
  const ref = cond ? ref1 : ref2;
  let t1;
  if ($[0] !== ref) {
    t1 = <Child ref={ref} />;
    $[0] = ref;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function ChildImpl(_props, ref) {
  const $ = _c(2);
  let t0;
  if ($[0] !== ref) {
    const cb = () => ref.current;
    t0 = <Stringify cb={cb} shouldInvokeFns={true} />;
    $[0] = ref;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

const Child = forwardRef(ChildImpl);

export const FIXTURE_ENTRYPOINT = {
  fn: Parent,
  params: [{ cond: true }],
  sequentialRenders: [{ cond: true }, { cond: false }],
};

```
      
### Eval output
(kind: ok) <div>{"cb":{"kind":"Function","result":1},"shouldInvokeFns":true}</div>
<div>{"cb":{"kind":"Function","result":2},"shouldInvokeFns":true}</div>