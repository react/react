function hoisting() {
  let foo = () => {
    return bar + baz;
  };
  let bar = 3;
  let baz = 2;
  return foo(); // OK: called outside of TDZ for bar/baz
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};
