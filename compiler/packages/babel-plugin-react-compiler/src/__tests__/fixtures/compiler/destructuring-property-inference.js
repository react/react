function Component(props) {
  const x = [];
  x.push(props.value);
  const {length: y} = x;
  foo(y);
  return [x, y];
}
