function foo() {
  'use memo';
  return [
    '\\uD800',
    '\\uDC00',
    '\\uD800\\uDC00',
    '\\\\uD800',
    '\\\\\\uDC00',
    '\\',
    '\\\\',
    '\\"',
    '𐀀',
    '\\𐀀',
    '\ud800\ud800',
    '\udc00\udc00',
    '\udc00\ud800',
    '\\uD800\udc00',
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};
