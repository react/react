function Component(props) {
  const x = [0, ...props.foo, null, ...props.bar, 'z'];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: [1, 2, 3], bar: [4, 5, 6]}],
  isComponent: false,
};
