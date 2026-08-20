// x's mutable range should extend to `mutate(y)`

function Component(props) {
  let x = [42, {}];
  const idx = foo(props.b);
  let y = x.at(idx);
  mutate(y);

  return x;
}
