function Foo() {
  type X = number;
  interface Bar {
    baz: number;
  }
  return 0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
