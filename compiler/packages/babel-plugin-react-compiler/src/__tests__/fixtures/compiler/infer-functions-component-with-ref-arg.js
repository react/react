// @compilationMode:"infer"

function Foo({}, ref) {
  return <div ref={ref} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
