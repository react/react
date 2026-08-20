const MODULE_LOCAL = new Set([4, 5, 6]);
function useFoo({propArr}: {propArr: Array<number>}) {
  /* Array can be memoized separately of the Set */
  const s1 = new Set([1, 2, 3]);
  s1.add(propArr[0]);

  /* but `.values` cannot be memoized separately */
  const s2 = new Set(MODULE_LOCAL.values());
  s2.add(propArr[1]);

  const s3 = new Set(s2.values());
  s3.add(propArr[2]);

  /**
   * s4 should be memoized separately from s3
   */
  const s4 = new Set(s3);
  s4.add(propArr[3]);
  return [s1, s2, s3, s4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{propArr: [7, 8, 9]}],
  sequentialRenders: [{propArr: [7, 8, 9]}, {propArr: [7, 8, 10]}],
};
