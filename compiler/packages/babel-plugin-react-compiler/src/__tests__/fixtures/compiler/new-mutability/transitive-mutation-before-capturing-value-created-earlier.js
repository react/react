// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = [a];
  const y = {b};
  mutate(y);
  y.x = x;
  return <div>{y}</div>;
}
