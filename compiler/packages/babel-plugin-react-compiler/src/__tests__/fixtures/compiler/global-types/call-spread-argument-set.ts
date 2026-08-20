import {useIdentity} from 'shared-runtime';

/**
 * Forked version of call-spread-argument-mutable-iterator that is known to not mutate
 * the spread argument since it is a Set
 */
function useFoo() {
  const s = new Set([1, 2]);
  useIdentity(null);
  return [Math.max(...s), s];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
  sequentialRenders: [{}, {}],
};
