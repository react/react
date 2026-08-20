function Foo({json}) {
  try {
    const foo = JSON.parse(json)?.foo;
    return <span>{foo}</span>;
  } catch {
    return null;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{json: '{"foo": "hello"}'}],
  sequentialRenders: [
    {json: '{"foo": "hello"}'},
    {json: '{"foo": "hello"}'},
    {json: '{"foo": "world"}'},
    {json: '{"bar": "no foo"}'},
    {json: '{}'},
    {json: 'invalid json'},
    {json: '{"foo": 42}'},
  ],
};
