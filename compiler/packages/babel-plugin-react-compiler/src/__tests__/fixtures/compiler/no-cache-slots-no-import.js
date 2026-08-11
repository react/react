// @compilationMode(all)
function useMyHook({a, b}) {
  return a + b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [{a: 1, b: 2}],
};
