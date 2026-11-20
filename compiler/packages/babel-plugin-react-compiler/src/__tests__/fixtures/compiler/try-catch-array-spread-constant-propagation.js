function foo() {
  'use memo';
  const x = 1;
  try {
    return [...x];
  } catch {
    return 'caught';
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
