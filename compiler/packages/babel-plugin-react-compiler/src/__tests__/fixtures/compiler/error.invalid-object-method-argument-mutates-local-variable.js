// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    onClick() {
      cache.set('key', 'value');
    },
  };
  useHook(handlers.onClick);
}
