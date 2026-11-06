function foo() {
  'use memo';
  try {
    try {
      return [...null];
    } catch {
      return [...undefined];
    }
  } catch {
    return 'outer catch';
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
