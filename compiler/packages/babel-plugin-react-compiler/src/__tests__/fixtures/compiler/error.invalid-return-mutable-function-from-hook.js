// @validateNoFreezingKnownMutableFunctions
import {useHook} from 'shared-runtime';

function useFoo() {
  useHook(); // for inference to kick in
  const cache = new Map();
  return () => {
    cache.set('key', 'value');
  };
}
