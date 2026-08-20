// @enableNewMutationAliasingModel
function Component({a, b, c}) {
  const x = [];
  x.push(a);
  const merged = {b}; // could be mutated by mutate(x) below
  x.push(merged);
  mutate(x);
  const independent = {c}; // can't be later mutated
  x.push(independent);
  return <Foo value={x} />;
}
