function foo() {
  'use memo';
  try {
    return [[1, , 3], [...'ok']];
  } catch {
    return 'caught';
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
