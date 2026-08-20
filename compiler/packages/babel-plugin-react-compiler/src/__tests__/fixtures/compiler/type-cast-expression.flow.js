// @flow
type Foo = {bar: string};
function Component(props) {
  const x = {bar: props.bar};
  const y = (x: Foo);
  y.bar = 'hello';
  const z = (y: Foo);
  return z;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
