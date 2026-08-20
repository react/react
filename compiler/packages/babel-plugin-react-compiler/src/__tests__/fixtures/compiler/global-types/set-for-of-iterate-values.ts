import {makeArray, useHook} from 'shared-runtime';

function useFoo({propArr}: {propArr: Array<number>}) {
  const s1 = new Set<number | Array<number>>([1, 2, 3]);
  s1.add(makeArray(propArr[0]));

  useHook();
  const s2 = new Set();
  for (const el of s1.values()) {
    s2.add(el);
  }

  return [s1, s2];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{propArr: [7, 8, 9]}],
  sequentialRenders: [
    {propArr: [7, 8, 9]},
    {propArr: [7, 8, 9]},
    {propArr: [7, 8, 10]},
  ],
};
