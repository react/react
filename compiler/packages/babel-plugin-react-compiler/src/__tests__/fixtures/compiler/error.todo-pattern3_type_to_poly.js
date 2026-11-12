// Pattern 3: shapeId null→generated + return Type→Poly
// Generic function with Object.entries().reduce()
// Divergence: TS has shapeId:null, return:Type(32); Rust has shapeId:"<generated_1>", return:Poly

/**
 * @flow strict
 */
export default function flipAndAggregateObject<TValue extends string>(obj: {
  +[key: TKey]: TValue,
  ...
}): {} {
  return Object.entries(obj).reduce((acc, [currKey, currVal]) => {
    return {};
  }, {});
}
