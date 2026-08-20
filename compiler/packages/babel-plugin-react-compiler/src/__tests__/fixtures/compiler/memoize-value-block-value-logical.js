function Foo(props) {
  let x;
  true && ((x = []), null);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
