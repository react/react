// @ignoreUseNoForget
function Component(prop) {
  'use no forget';
  const result = prop.x.toFixed();
  return <div>{result}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};
