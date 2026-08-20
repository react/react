function Foo() {
  const getX = () => x;
  console.log(getX());

  let x = 4;
  x += 5;

  return <Stringify getX={getX} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
