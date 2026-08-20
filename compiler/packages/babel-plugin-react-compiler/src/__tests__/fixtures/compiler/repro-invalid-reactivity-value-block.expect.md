
## Input

```javascript
import {
  CONST_TRUE,
  identity,
  makeObject_Primitives,
  useNoAlias,
} from 'shared-runtime';

/**
 * Here the scope for `obj` is pruned because it spans the `useNoAlias()` hook call.
 * Because `obj` is non-reactive, it would by default be excluded as dependency for
 * `result = [...identity(obj)..., obj]`, but this could then cause the values in
 * `result` to be out of sync with `obj`.
 *
 * The fix is to consider pruned memo block outputs as reactive, since they will
 * recreate on every render. This means `thing` depends on both y and z.
 */
function Foo() {
  const obj = makeObject_Primitives();
  // hook calls keeps the next two lines as its own reactive scope
  useNoAlias();

  const shouldCaptureObj = obj != null && CONST_TRUE;
  const result = [shouldCaptureObj ? identity(obj) : null, obj];

  useNoAlias(result, obj);

  if (shouldCaptureObj && result[0] !== obj) {
    throw new Error('Unexpected');
  }
  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import {
  CONST_TRUE,
  identity,
  makeObject_Primitives,
  useNoAlias,
} from "shared-runtime";

/**
 * Here the scope for `obj` is pruned because it spans the `useNoAlias()` hook call.
 * Because `obj` is non-reactive, it would by default be excluded as dependency for
 * `result = [...identity(obj)..., obj]`, but this could then cause the values in
 * `result` to be out of sync with `obj`.
 *
 * The fix is to consider pruned memo block outputs as reactive, since they will
 * recreate on every render. This means `thing` depends on both y and z.
 */
function Foo() {
  const $ = _c(3);
  const obj = makeObject_Primitives();

  useNoAlias();

  const shouldCaptureObj = obj != null && CONST_TRUE;
  const t0 = shouldCaptureObj ? identity(obj) : null;
  let t1;
  if ($[0] !== obj || $[1] !== t0) {
    t1 = [t0, obj];
    $[0] = obj;
    $[1] = t0;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const result = t1;

  useNoAlias(result, obj);

  if (shouldCaptureObj && result[0] !== obj) {
    throw new Error("Unexpected");
  }

  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
  sequentialRenders: [{}, {}],
};

```
      
### Eval output
(kind: ok) [{"a":0,"b":"value1","c":true},"[[ cyclic ref *1 ]]"]
[{"a":0,"b":"value1","c":true},"[[ cyclic ref *1 ]]"]