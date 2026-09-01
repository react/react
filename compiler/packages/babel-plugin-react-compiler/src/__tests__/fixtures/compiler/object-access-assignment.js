function Component({a, b, c}) {
  // This is an object version of array-access-assignment.js
  // Meant to confirm that object expressions and PropertyStore/PropertyLoad with strings
  // works equivalently to array expressions and property accesses with numeric indices
  const x = {zero: a};
  const y = {zero: null, one: b};
  const z = {zero: {}, one: {}, two: {zero: c}};
  x.zero = y.one;
  z.zero.zero = x.zero;
  return {zero: x, one: z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 20, c: 300}],
  sequentialRenders: [
    {a: 2, b: 20, c: 300},
    {a: 3, b: 20, c: 300},
    {a: 3, b: 21, c: 300},
    {a: 3, b: 22, c: 300},
    {a: 3, b: 22, c: 301},
  ],
};
