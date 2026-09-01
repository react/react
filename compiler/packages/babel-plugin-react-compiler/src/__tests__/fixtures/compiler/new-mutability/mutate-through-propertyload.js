// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {};
  const y = {x};
  const z = y.x;
  z.true = false;
  return <div>{z}</div>;
}
