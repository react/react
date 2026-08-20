
## Input

```javascript
import {throwErrorWithMessage, ValidateMemoization} from 'shared-runtime';

/**
 * Context variables are local variables that (1) have at least one reassignment
 * and (2) are captured into a function expression. These have a known mutable
 * range: from first declaration / assignment to the last direct or aliased,
 * mutable reference.
 *
 * This fixture validates that forget can take granular dependencies on context
 * variables when the reference to a context var happens *after* the end of its
 * mutable range.
 */
function Component({cond, a}) {
  let contextVar;
  if (cond) {
    contextVar = {val: a};
  } else {
    contextVar = {};
    throwErrorWithMessage('');
  }
  const cb = {cb: () => contextVar.val * 4};

  /**
   * manually specify input to avoid adding a `PropertyLoad` from contextVar,
   * which might affect hoistable-objects analysis.
   */
  return (
    <ValidateMemoization
      inputs={[cond ? a : undefined]}
      output={cb}
      onlyCheckCompiled={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, a: undefined}],
  sequentialRenders: [
    {cond: true, a: 2},
    {cond: true, a: 2},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { throwErrorWithMessage, ValidateMemoization } from "shared-runtime";

/**
 * Context variables are local variables that (1) have at least one reassignment
 * and (2) are captured into a function expression. These have a known mutable
 * range: from first declaration / assignment to the last direct or aliased,
 * mutable reference.
 *
 * This fixture validates that forget can take granular dependencies on context
 * variables when the reference to a context var happens *after* the end of its
 * mutable range.
 */
function Component(t0) {
  const $ = _c(10);
  const { cond, a } = t0;
  let contextVar;
  if ($[0] !== a || $[1] !== cond) {
    if (cond) {
      contextVar = { val: a };
    } else {
      contextVar = {};
      throwErrorWithMessage("");
    }
    $[0] = a;
    $[1] = cond;
    $[2] = contextVar;
  } else {
    contextVar = $[2];
  }
  let t1;
  if ($[3] !== contextVar) {
    t1 = { cb: () => contextVar.val * 4 };
    $[3] = contextVar;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const cb = t1;

  const t2 = cond ? a : undefined;
  let t3;
  if ($[5] !== t2) {
    t3 = [t2];
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  let t4;
  if ($[7] !== cb || $[8] !== t3) {
    t4 = (
      <ValidateMemoization inputs={t3} output={cb} onlyCheckCompiled={true} />
    );
    $[7] = cb;
    $[8] = t3;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  return t4;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: false, a: undefined }],
  sequentialRenders: [
    { cond: true, a: 2 },
    { cond: true, a: 2 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"inputs":[2],"output":{"cb":"[[ function params=0 ]]"}}</div>
<div>{"inputs":[2],"output":{"cb":"[[ function params=0 ]]"}}</div>