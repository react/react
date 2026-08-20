function foo() {
  const {data: t} = {data: 1};
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};
