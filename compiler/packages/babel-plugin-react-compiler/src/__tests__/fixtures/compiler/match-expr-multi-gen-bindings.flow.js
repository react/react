// @flow
// Match expression with multiple match arms that generate separate $$gen$m
// bindings ($$gen$m0, $$gen$m1). Hermes match desugar places all synthetic
// identifiers at position 0. The scope resolver must not corrupt bindings
// when multiple $$gen$m names share the same source position.

export default component MatchExprMultiGenBindings(
  x: ?{v: string},
  y: ?{w: number}
) {
  const a = match (x?.v) {
    'yes' => 1,
    _ => 0,
  };
  const b = match (y?.w) {
    42 => 'found',
    _ => 'not found',
  };
  return (
    <div>
      {a}
      {b}
    </div>
  );
}
