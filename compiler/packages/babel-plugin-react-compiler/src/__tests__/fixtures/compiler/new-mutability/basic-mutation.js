// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {a};
  const y = [b];
  y.x = x;
  mutate(y);
  return <div>{x}</div>;
}
