import {identity, useIdentity} from 'shared-runtime';

/**
 * The scope produced by `identity(value)` in the ternary test gets aligned outward
 * to span the whole inlined IIFE (both `return`s become reassignments of the IIFE
 * temporary + breaks out of the try). That scope's only own declaration lives in
 * the ternary *test*, which PruneNonEscapingScopes never visits for memoization
 * inputs, so the scope must still be registered when it is associated with the
 * reassigned temporary.
 */
function Component({value}) {
  const object = useIdentity({value});
  return (() => {
    try {
      return identity(object.value) ? object : null;
    } catch {
      return null;
    }
  })();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'hello'}],
  sequentialRenders: [{value: 'hello'}, {value: 'hello'}, {value: ''}],
};
