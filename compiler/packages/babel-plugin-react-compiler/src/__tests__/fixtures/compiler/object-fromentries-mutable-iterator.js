function useEntries({a, consume}) {
  const entries = [['key', a]].values();
  if (consume) {
    Object.fromEntries(entries);
  }
  return Object.fromEntries(entries);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{a: 42, consume: false}],
  sequentialRenders: [
    {a: 42, consume: false},
    {a: 42, consume: true},
    {a: 42, consume: false},
  ],
};
