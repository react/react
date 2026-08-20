function hoisting() {
  const qux = () => {
    let result;
    {
      result = foo();
    }
    return result;
  };
  const foo = () => {
    return bar + baz;
  };
  const bar = 3;
  const baz = 2;
  return qux(); // OK: called outside of TDZ
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};
