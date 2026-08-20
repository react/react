function component(a) {
  let t = {a};
  x(t); // hoisted call
  function x(p) {
    p.a.foo();
  }
  return t;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [
    {
      foo: () => {
        console.log(42);
      },
    },
  ],
};
