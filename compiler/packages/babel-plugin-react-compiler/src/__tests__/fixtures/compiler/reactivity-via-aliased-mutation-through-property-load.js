function Component(props) {
  const x = {};
  const y = [];
  x.y = y;
  x.y.push(props.input);

  let z = 0;
  if (x.y[0]) {
    z = 1;
  }

  return [z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {input: true},
    {input: true},
    {input: false},
    {input: false},
    {input: true},
    {input: false},
    {input: true},
    {input: false},
  ],
};
