function hoisting() {
  const x = {
    foo() {
      return bar();
    },
  };
  const bar = () => {
    return 1;
  };

  return x.foo(); // OK: bar's value is only accessed outside of its TDZ
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
};
