// @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated soundness case for @enableOptimisticBuiltinMethodShapes.
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-mutating-lambda (a
 * compile-snapshot-only fixture), modeled on
 * array-map-mutable-array-mutating-lambda for a known array receiver.
 *
 * `getItems` is defined module-locally (not imported from shared-runtime) so
 * its return value keeps an UNKNOWN type, which is what triggers the flag path.
 * With the flag on, the unknown receiver's `.map` resolves to the builtin Array
 * `map` signature. That signature still models the callback receiving items
 * derived from the receiver (`CreateFrom`), so a callback that MUTATES its item
 * is tracked correctly and the mutation is not silently dropped: sprout runs
 * both the original and compiled output and asserts identical results.
 */
function getItems(data) {
  return data.map(value => ({value, updated: false}));
}

function Component({data}) {
  const processedData = getItems(data);
  const y = processedData.map(item => {
    item.updated = true;
    return item;
  });
  return [processedData, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{data: [1, 2]}],
  isComponent: false,
};
