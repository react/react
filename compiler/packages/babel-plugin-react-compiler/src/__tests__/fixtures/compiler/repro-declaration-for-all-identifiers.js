function Foo() {
  try {
    for (let i = 0; i < 2; i++) {}
  } catch {}
  return <span>ok</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
  sequentialRenders: [{}, {}, {}],
};
