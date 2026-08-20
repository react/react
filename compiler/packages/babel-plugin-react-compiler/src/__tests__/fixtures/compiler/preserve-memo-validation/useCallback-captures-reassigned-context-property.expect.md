
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * TODO: we're currently bailing out because `contextVar` is a context variable
 * and not recorded into the PropagateScopeDeps LoadLocal / PropertyLoad
 * sidemap. Previously, we were able to avoid this as `BuildHIR` hoisted
 * `LoadContext` and `PropertyLoad` instructions into the outer function, which
 * we took as eligible dependencies.
 *
 * One solution is to simply record `LoadContext` identifiers into the
 * temporaries sidemap when the instruction occurs *after* the context
 * variable's mutable range.
 */
function Foo(props) {
  let contextVar;
  if (props.cond) {
    contextVar = {val: 2};
  } else {
    contextVar = {};
  }

  const cb = useCallback(() => [contextVar.val], [contextVar.val]);

  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";
import { Stringify } from "shared-runtime";

/**
 * TODO: we're currently bailing out because `contextVar` is a context variable
 * and not recorded into the PropagateScopeDeps LoadLocal / PropertyLoad
 * sidemap. Previously, we were able to avoid this as `BuildHIR` hoisted
 * `LoadContext` and `PropertyLoad` instructions into the outer function, which
 * we took as eligible dependencies.
 *
 * One solution is to simply record `LoadContext` identifiers into the
 * temporaries sidemap when the instruction occurs *after* the context
 * variable's mutable range.
 */
function Foo(props) {
  const $ = _c(6);
  let contextVar;
  if ($[0] !== props.cond) {
    if (props.cond) {
      contextVar = { val: 2 };
    } else {
      contextVar = {};
    }
    $[0] = props.cond;
    $[1] = contextVar;
  } else {
    contextVar = $[1];
  }
  let t0;
  if ($[2] !== contextVar.val) {
    t0 = () => [contextVar.val];
    $[2] = contextVar.val;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  contextVar;
  const cb = t0;
  let t1;
  if ($[4] !== cb) {
    t1 = <Stringify cb={cb} shouldInvokeFns={true} />;
    $[4] = cb;
    $[5] = t1;
  } else {
    t1 = $[5];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ cond: true }],
};

```
      
### Eval output
(kind: ok) <div>{"cb":{"kind":"Function","result":[2]},"shouldInvokeFns":true}</div>