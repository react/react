// @enableTransitivelyFreezeFunctionExpressions
function Component(props) {
  let x = {value: 0};
  const inner = () => {
    return x.value;
  };
  const outer = () => {
    return inner();
  };
  // Freezing outer should transitively freeze inner AND x (two levels deep).
  // x is only reachable through the function chain, not directly in JSX.
  const element = <Child fn={outer} />;
  // Mutating x after the freeze — TS should detect MutateFrozen,
  // Rust may not if transitive freeze didn't reach x.
  x.value = 1;
  return element;
}
