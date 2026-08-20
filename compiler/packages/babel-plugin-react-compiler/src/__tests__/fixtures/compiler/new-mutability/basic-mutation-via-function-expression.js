// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {a};
  const y = [b];
  const f = () => {
    y.x = x;
    mutate(y);
  };
  f();
  return <div>{x}</div>;
}
