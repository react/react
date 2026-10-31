// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    onClick: () => {
      cache.set('key', 'value');
    },
  };
  const {onClick} = handlers;
  useHook(onClick);
}
