// @gating
const result = Foo(42);
function Foo(value) {
  'use memo';
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => result,
  params: [],
};
