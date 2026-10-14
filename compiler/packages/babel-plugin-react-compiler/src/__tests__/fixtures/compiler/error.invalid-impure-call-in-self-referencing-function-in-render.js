// @validateNoImpureFunctionsInRender
function Component({n}) {
  const fact = k => (k <= 1 ? Date.now() : fact(k - 1));
  const now = fact(n);
  return <div>{now}</div>;
}
