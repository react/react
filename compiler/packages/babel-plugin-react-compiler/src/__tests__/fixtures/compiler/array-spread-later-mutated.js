function useBar({arg}) {
  /**
   * Note that mutableIterator is mutated by the later object spread. Therefore,
   * `s.values()` should be memoized within the same block as the object spread.
   * In terms of compiler internals, they should have the same reactive scope.
   */
  const obj = {};
  const s = new Set([obj, 5, 4]);
  const mutableIterator = s.values();
  const arr = [...mutableIterator];

  obj.x = arg;
  return arr;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useBar,
  params: [{arg: 3}],
  sequentialRenders: [{arg: 3}, {arg: 3}, {arg: 4}],
};
