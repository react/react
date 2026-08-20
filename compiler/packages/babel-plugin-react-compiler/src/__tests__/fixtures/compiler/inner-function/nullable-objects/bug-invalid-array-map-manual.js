function useFoo({arr1, arr2}) {
  const cb = e => arr2[0].value + e.value;
  const y = [];
  for (let i = 0; i < arr1.length; i++) {
    y.push(cb(arr1[i]));
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{arr1: [], arr2: []}],
  sequentialRenders: [
    {arr1: [], arr2: []},
    {arr1: [], arr2: null},
    {arr1: [{value: 1}, {value: 2}], arr2: [{value: -1}]},
  ],
};
