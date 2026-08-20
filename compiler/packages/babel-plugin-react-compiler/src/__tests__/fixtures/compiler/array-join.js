function Component(props) {
  const x = [{}, [], props.value];
  const y = x.join(() => 'this closure gets stringified, not called');
  foo(y);
  return [x, y];
}
