function component(props) {
  let x = [];
  let y = [];
  y.push(useHook(props.foo));
  x.push(y);
  return x;
}
