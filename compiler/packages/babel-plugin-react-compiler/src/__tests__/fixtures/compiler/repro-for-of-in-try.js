function Foo({obj}) {
  const items = [];
  try {
    for (const [key, value] of Object.entries(obj)) {
      items.push(`${key}: ${value}`);
    }
  } catch (e) {
    return <span>Error</span>;
  }
  return <span>{items.join(', ')}</span>;
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
