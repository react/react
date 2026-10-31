// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    mutates() {
      cache.set('key', 'value');
    },
    readOnly() {},
  };
  // Only `mutates` is a known-mutable function, `readOnly` is safe to pass.
  useHook(handlers.readOnly);
}
