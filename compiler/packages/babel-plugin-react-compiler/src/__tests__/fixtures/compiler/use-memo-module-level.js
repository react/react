// @compilationMode:"annotation"
'use memo';

function Component({a, b}) {
  return <div>{a + b}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2}],
};
