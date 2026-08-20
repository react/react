// @flow
function Component(props) {
  type User = {name: string};
  const user: User = {name: props.name};
  return user;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Mofei'}],
};
