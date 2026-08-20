/**
 * Assume that only directly returned functions or JSX attributes are invoked.
 * Conservatively estimate that functions wrapped in objects or other containers
 * might never be called (and therefore their property loads are not hoistable).
 */
function useMakeCallback({arr}) {
  return {
    getElement0: () => arr[0].value,
    getElement1: () => arr[1].value,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{arr: [1, 2]}],
  sequentialRenders: [{arr: [1, 2]}, {arr: []}],
};
