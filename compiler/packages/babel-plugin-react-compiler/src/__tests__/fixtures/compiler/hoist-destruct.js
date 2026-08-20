//@flow
component Foo() {
  function foo() {
    return (
      <div>
        {a} {z} {y}
      </div>
    );
  }
  const [a, {x: z, y = 10}] = [1, {x: 2}];
  return foo();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
