//@flow

const foo = undefined;

component C(...{scope = foo ?? null}: any) {
  return scope;
}

export const FIXTURE_ENTRYPOINT = {
  fn: C,
  params: [{scope: undefined}],
};
