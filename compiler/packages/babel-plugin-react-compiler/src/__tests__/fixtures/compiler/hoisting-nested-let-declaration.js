function hoisting() {
  let qux = () => {
    let result;
    {
      result = foo();
    }
    return result;
  };
  let foo = () => {
    return bar + baz;
  };
  let bar = 3;
  const baz = 2;
  return qux(); // OK: called outside of TDZ
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};
