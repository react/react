function useEntries({a}) {
  const state = {count: 0};
  const entry = ['key', a];
  const container = {entry};
  const pairs = [entry];
  container.entry[0] = {
    toString: () => {
      state.count++;
      return 'key';
    },
  };
  const result = Object.fromEntries(pairs);
  return [result, state.count];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useEntries,
  params: [{a: 1}],
  sequentialRenders: [{a: 1}, {a: 2}, {a: 3}],
};
