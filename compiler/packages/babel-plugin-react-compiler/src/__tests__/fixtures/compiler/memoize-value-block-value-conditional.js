function Foo(props) {
  let x;
  true ? (x = []) : (x = {});
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
