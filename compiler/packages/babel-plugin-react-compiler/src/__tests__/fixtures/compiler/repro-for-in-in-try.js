function Foo({obj}) {
  const keys = [];
  try {
    for (const key in obj) {
      keys.push(key);
    }
  } catch (e) {
    return <span>Error</span>;
  }
  return <span>{keys.join(', ')}</span>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{obj: {a: 1, b: 2}}],
  sequentialRenders: [
    {obj: {a: 1, b: 2}},
    {obj: {a: 1, b: 2}},
    {obj: {x: 'hello', y: 'world'}},
    {obj: {}},
    {obj: {single: 'value'}},
  ],
};
