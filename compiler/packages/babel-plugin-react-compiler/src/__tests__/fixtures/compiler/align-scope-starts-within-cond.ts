import {mutate} from 'shared-runtime';

/**
 * Similar fixture to `align-scopes-nested-block-structure`, but
 * a simpler case.
 */
function useFoo(cond) {
  let s = null;
  if (cond) {
    s = {};
  } else {
    return null;
  }
  mutate(s);
  return s;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};
