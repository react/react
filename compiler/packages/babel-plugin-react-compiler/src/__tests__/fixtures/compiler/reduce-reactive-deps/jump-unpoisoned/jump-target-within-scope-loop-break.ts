function useFoo({input, max}) {
  const x = [];
  let i = 0;
  while (true) {
    i += 1;
    if (i > max) {
      break;
    }
  }
  x.push(i);
  x.push(input.a.b); // unconditional
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {a: {b: 2}}, max: 8}],
  sequentialRenders: [
    {input: {a: {b: 2}}, max: 8},
    // preserve nullthrows
    {input: null, max: 8},
    {input: {}, max: 8},
    {input: {a: {b: null}}, max: 8},
    {input: {a: null}, max: 8},
    {input: {a: {b: 3}}, max: 8},
  ],
};
