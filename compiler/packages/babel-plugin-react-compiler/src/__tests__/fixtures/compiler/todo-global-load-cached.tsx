import {Stringify} from 'shared-runtime';
import {makeArray} from 'shared-runtime';

/**
 * Here, we don't need to memoize Stringify as it is a read off of a global.
 * TODO: in PropagateScopeDeps (hir), we should produce a sidemap of global rvals
 * and avoid adding them to `temporariesUsedOutsideDefiningScope`.
 */
function Component({num}: {num: number}) {
  const arr = makeArray(num);
  return <Stringify value={arr.push(num)}></Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{num: 2}],
};
