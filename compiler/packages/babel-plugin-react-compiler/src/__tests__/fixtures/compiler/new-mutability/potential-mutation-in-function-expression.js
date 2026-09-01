// @enableNewMutationAliasingModel
function Component({a, b, c}) {
  const x = [a, b];
  const f = () => {
    maybeMutate(x);
    // different dependency to force this not to merge with x's scope
    console.log(c);
  };
  return <Foo onClick={f} value={x} />;
}
