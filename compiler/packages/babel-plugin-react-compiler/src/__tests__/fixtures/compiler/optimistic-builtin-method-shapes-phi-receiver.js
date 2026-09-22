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
