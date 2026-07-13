function Component({a, b, fallback}) {
  try {
    // fallback.value is accessed WITHIN the ?? chain
    const result = a ?? b ?? fallback.value;
    return <span>{result}</span>;
  } catch {
    return <span>error</span>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 'first', b: 'second', fallback: {value: 'default'}}],
  sequentialRenders: [
    {a: 'first', b: 'second', fallback: {value: 'default'}},
    {a: 'first', b: 'second', fallback: {value: 'default'}},
    {a: null, b: 'second', fallback: {value: 'default'}},
    {a: null, b: null, fallback: {value: 'fallback'}},
    {a: undefined, b: undefined, fallback: {value: 'fallback'}},
    {a: 0, b: 'not zero', fallback: {value: 'default'}},
    {a: null, b: null, fallback: null}, // errors because fallback.value throws WITHIN the ?? chain
  ],
};
