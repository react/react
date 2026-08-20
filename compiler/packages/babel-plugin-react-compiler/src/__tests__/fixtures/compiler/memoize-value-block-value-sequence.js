function Foo(props) {
  let x;
  (x = []), null;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
