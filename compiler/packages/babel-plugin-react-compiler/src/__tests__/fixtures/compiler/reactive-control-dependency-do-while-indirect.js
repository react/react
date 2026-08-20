function Component(props) {
  let x = 0;
  let y = 0;
  let z = 0;
  do {
    x += 1;
    y += 1;
    z = y;
  } while (x < props.limit);
  return [z];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {limit: 10},
    {limit: 10},
    {limit: 1},
    {limit: 1},
    {limit: 10},
    {limit: 1},
    {limit: 10},
    {limit: 1},
  ],
};
