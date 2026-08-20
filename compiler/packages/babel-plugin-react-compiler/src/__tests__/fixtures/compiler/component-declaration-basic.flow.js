// @flow @compilationMode:"infer"
export default component Foo(bar: number) {
  return <Bar bar={bar} />;
}

component Bar(bar: number) {
  return <div>{bar}</div>;
}

function shouldNotCompile() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{bar: 42}],
};
