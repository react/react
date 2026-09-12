
## Input

```javascript
// @enableOptimisticBuiltinMethodShapes

/**
 * Documents that the optimistic fallback is one-shot and depends on the state
 * of the receiver's type at unification time: property constraints resolve
 * once, with no re-queue. Here the receiver `x` is a phi joining an unknown
 * value (the `makeUnknownValue(items)` call result) with a concrete array. By
 * the time `x.map` unifies, the receiver's type is a phi -- not an unresolved
 * type variable -- so the optimistic fallback does NOT fire and `.map` is
 * handled conservatively: the call may mutate `x`, keeping the receiver's
 * construction and the `.map` call merged into a single reactive scope.
 */
function Component({items, cond}) {
  let x;
  if (cond) {
    x = makeUnknownValue(items);
  } else {
    x = [0];
  }
  const y = x.map(item => item.id);
  return <Items results={y} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableOptimisticBuiltinMethodShapes

/**
 * Documents that the optimistic fallback is one-shot and depends on the state
 * of the receiver's type at unification time: property constraints resolve
 * once, with no re-queue. Here the receiver `x` is a phi joining an unknown
 * value (the `makeUnknownValue(items)` call result) with a concrete array. By
 * the time `x.map` unifies, the receiver's type is a phi -- not an unresolved
 * type variable -- so the optimistic fallback does NOT fire and `.map` is
 * handled conservatively: the call may mutate `x`, keeping the receiver's
 * construction and the `.map` call merged into a single reactive scope.
 */
function Component(t0) {
  const $ = _c(5);
  const { items, cond } = t0;
  let t1;
  if ($[0] !== cond || $[1] !== items) {
    let x;
    if (cond) {
      x = makeUnknownValue(items);
    } else {
      x = [0];
    }
    t1 = x.map(_temp);
    $[0] = cond;
    $[1] = items;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const y = t1;
  let t2;
  if ($[3] !== y) {
    t2 = <Items results={y} />;
    $[3] = y;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}
function _temp(item) {
  return item.id;
}

```
      
### Eval output
(kind: exception) Fixture not implemented