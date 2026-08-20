import * as SharedRuntime from 'shared-runtime';
import {makeArray} from 'shared-runtime';

/**
 * Here, we don't need to memoize SharedRuntime.Stringify as it is a PropertyLoad
 * off of a global.
 * TODO: in PropagateScopeDeps (hir), we should produce a sidemap of global rvals
 * and avoid adding them to `temporariesUsedOutsideDefiningScope`.
 */
function Component({num}: {num: number}) {
  const arr = makeArray(num);
  return (
    <SharedRuntime.Stringify value={arr.push(num)}></SharedRuntime.Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{num: 2}],
};
