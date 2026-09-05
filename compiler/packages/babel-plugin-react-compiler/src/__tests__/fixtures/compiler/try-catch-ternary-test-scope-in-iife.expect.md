
## Input

```javascript
import {identity, useIdentity} from 'shared-runtime';

/**
 * The scope produced by `identity(value)` in the ternary test gets aligned outward
 * to span the whole inlined IIFE (both `return`s become reassignments of the IIFE
 * temporary + breaks out of the try). That scope's only own declaration lives in
 * the ternary *test*, which PruneNonEscapingScopes never visits for memoization
 * inputs, so the scope must still be registered when it is associated with the
 * reassigned temporary.
 */
function Component({value}) {
  const object = useIdentity({value});
  return (() => {
    try {
      return identity(object.value) ? object : null;
    } catch {
      return null;
    }
  })();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'hello'}],
  sequentialRenders: [{value: 'hello'}, {value: 'hello'}, {value: ''}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity, useIdentity } from "shared-runtime";

/**
 * The scope produced by `identity(value)` in the ternary test gets aligned outward
 * to span the whole inlined IIFE (both `return`s become reassignments of the IIFE
 * temporary + breaks out of the try). That scope's only own declaration lives in
 * the ternary *test*, which PruneNonEscapingScopes never visits for memoization
 * inputs, so the scope must still be registered when it is associated with the
 * reassigned temporary.
 */
function Component(t0) {
  const $ = _c(4);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = { value };
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const object = useIdentity(t1);
  let t2;
  if ($[2] !== object) {
    try {
      t2 = identity(object.value) ? object : null;
    } catch {
      t2 = null;
    }
    $[2] = object;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: "hello" }],
  sequentialRenders: [{ value: "hello" }, { value: "hello" }, { value: "" }],
};

```
      
### Eval output
(kind: ok) {"value":"hello"}
{"value":"hello"}
null