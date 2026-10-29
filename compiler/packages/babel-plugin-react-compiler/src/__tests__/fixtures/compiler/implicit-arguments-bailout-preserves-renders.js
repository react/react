// @panicThreshold:"none"

function Component(props) {
  return <div>{arguments[0].value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [{value: 1}, {value: 2}],
};
