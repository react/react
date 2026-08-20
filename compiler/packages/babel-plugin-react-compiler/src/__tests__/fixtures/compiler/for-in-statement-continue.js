function Component(props) {
  let x;
  const object = {...props.value};
  for (const y in object) {
    if (y === 'continue') {
      continue;
    }
    x = object[y];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 'a', continue: 'skip', b: 'hello!'}}],
  sequentialRenders: [
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'a', continue: 'skip', b: 'hello!'}},
    {value: {a: 'skip!', continue: true}},
    {value: {a: 'skip!', continue: true}},
  ],
};
