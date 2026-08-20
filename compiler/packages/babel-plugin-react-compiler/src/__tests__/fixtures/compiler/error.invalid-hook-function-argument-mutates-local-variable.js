// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  useHook(() => {
    cache.set('key', 'value');
  });
}
