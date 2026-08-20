// writing to primitives is not a 'mutate' or 'store' to context references,
// under current analysis in AnalyzeFunctions.
// <unknown> $23:TFunction = Function @deps[<unknown>
//   $21:TPrimitive,<unknown> $22:TPrimitive]:

function Component() {
  let x = 40;

  const fn = function () {
    x = x + 1;
  };
  fn();
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
