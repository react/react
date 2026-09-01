function Foo() {
  const x = () => {
    window.href = 'foo';
  };
  const y = {x};
  return <Bar y={y} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};
