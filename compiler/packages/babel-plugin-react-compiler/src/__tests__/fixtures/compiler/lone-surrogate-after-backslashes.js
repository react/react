function foo() {
  'use memo';
  return [
    '\ud800',
    '\\\ud800',
    '\\\\\ud800',
    '\\\\\\\ud800',
    '\udc00',
    '\\\udc00',
    '\\\\\udc00',
    '\\\\\\\udc00',
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
