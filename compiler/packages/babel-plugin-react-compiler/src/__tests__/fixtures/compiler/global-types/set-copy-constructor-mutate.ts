import {makeArray, mutate} from 'shared-runtime';

function useFoo({propArr}: {propArr: Array<number>}) {
  const s1 = new Set<number | Array<number>>([1, 2, 3]);
  s1.add(makeArray(propArr[0]));

  const s2 = new Set(s1);
  // this may also may mutate s1
  mutate(s2);

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
