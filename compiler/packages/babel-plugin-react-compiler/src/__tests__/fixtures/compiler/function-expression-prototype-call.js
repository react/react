function Component(props) {
  const f = function () {
    return <div>{props.name}</div>;
  };
  return f.call();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Jason'}],
};
