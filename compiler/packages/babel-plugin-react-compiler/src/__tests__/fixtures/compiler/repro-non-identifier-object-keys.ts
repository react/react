function Foo() {
  return {
    'a.b': 1,
    'a\b': 2,
    'a/b': 3,
    'a+b': 4,
    'a b': 5,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  isComponent: false,
};
