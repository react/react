function f(a) {
  let x;
  (() => {
    x = {};
  })();
  // this is not reactive on `x` as `x` is never reactive
  return <div x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
