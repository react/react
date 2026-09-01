// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {a};
  useFreeze(x);
  x.y = true;
  return <div>error</div>;
}
