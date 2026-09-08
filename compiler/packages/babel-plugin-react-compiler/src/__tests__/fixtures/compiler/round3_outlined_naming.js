// @enableFunctionOutlining
// Minimized repro for C5: outlined function naming divergence.
// When source code has variables named _temp/_temp2, Babel's generateUid
// skips those names, but the Rust compiler's blind counter doesn't.
function Component(props) {
  const _temp = props.a;
  const _temp2 = props.b;
  return props.items.map(() => <div />);
}
