function Component(props) {
  // Intentionally don't bind state, this repros a bug where we didn't
  // infer the type of destructured properties after a hole in the array
  let [, setState] = useState();
  setState(1);
  return props.foo;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
