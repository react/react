function Component(props) {
  'use memo';
  let x = [props.foo];
  return <div x={x}>"foo"</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{foo: 1}],
  isComponent: true,
};
