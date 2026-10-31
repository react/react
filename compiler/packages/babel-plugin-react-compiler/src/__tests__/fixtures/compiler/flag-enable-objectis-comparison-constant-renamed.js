// @enableObjectIsComparison
const is = null;

function Component(props) {
  const x = [props.x];
  console.log(is);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 42}],
  sequentialRenders: [{x: 42}, {x: 42}, {x: 3.14}],
};
