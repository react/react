function Component(props) {
  // b is an object, must be memoized even though the input is not memoized
  const {a, ...b} = props.a;
  // d is an array, mut be memoized even though the input is not memoized
  const [c, ...d] = props.c;
  return <div b={b} d={d}></div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
