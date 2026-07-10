
## Input

```javascript
// When a const variable is hoisted (used before declaration in the source),
// the lowering emits a DeclareContext with HoistedConst kind.
// PruneHoistedContexts removes these from top-level blocks, but if the
// DeclareContext ends up inside a SequenceExpression (value block), the
// visitor uses visitInstruction (not transformInstruction) and can't remove it.
// Codegen must convert hoisted kinds to their non-hoisted equivalents.

function Component({cond, items}) {
  const result = cond ? foo(items) : null;
  return result;
}

function foo(items) {
  return items.map(x => x.id);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, items: [{id: 1}]}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // When a const variable is hoisted (used before declaration in the source),
// the lowering emits a DeclareContext with HoistedConst kind.
// PruneHoistedContexts removes these from top-level blocks, but if the
// DeclareContext ends up inside a SequenceExpression (value block), the
// visitor uses visitInstruction (not transformInstruction) and can't remove it.
// Codegen must convert hoisted kinds to their non-hoisted equivalents.

function Component(t0) {
  const $ = _c(3);
  const { cond, items } = t0;
  let t1;
  if ($[0] !== cond || $[1] !== items) {
    t1 = cond ? foo(items) : null;
    $[0] = cond;
    $[1] = items;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const result = t1;
  return result;
}

function foo(items) {
  const $ = _c(2);
  let t0;
  if ($[0] !== items) {
    t0 = items.map(_temp);
    $[0] = items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function _temp(x) {
  return x.id;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cond: true, items: [{ id: 1 }] }],
};

```
      
### Eval output
(kind: ok) [1]