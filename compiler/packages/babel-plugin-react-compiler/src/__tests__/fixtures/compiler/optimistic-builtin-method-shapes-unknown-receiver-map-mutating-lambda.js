// @enableOptimisticBuiltinMethodShapes

/**
 * Soundness case: with @enableOptimisticBuiltinMethodShapes the unknown
 * receiver's `.map` resolves to the builtin Array `map` signature. That
 * signature still models the callback receiving items derived from the receiver
 * (`CreateFrom`), so a callback that MUTATES its item is tracked correctly --
 * the mutation is not silently dropped. This mirrors
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 */
function Component({data}) {
  const processedData = getItems(data);
  const y = processedData.map(item => {
    item.updated = true;
    return item;
  });
  return [processedData, y];
}
