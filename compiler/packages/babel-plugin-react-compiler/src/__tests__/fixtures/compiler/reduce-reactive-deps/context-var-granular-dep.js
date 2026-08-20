import {throwErrorWithMessage, ValidateMemoization} from 'shared-runtime';

/**
 * Context variables are local variables that (1) have at least one reassignment
 * and (2) are captured into a function expression. These have a known mutable
 * range: from first declaration / assignment to the last direct or aliased,
 * mutable reference.
 *
 * This fixture validates that forget can take granular dependencies on context
 * variables when the reference to a context var happens *after* the end of its
 * mutable range.
 */
function Component({cond, a}) {
  let contextVar;
  if (cond) {
    contextVar = {val: a};
  } else {
    contextVar = {};
    throwErrorWithMessage('');
  }
  const cb = {cb: () => contextVar.val * 4};

  /**
   * manually specify input to avoid adding a `PropertyLoad` from contextVar,
   * which might affect hoistable-objects analysis.
   */
  return (
    <ValidateMemoization
      inputs={[cond ? a : undefined]}
      output={cb}
      onlyCheckCompiled={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: false, a: undefined}],
  sequentialRenders: [
    {cond: true, a: 2},
    {cond: true, a: 2},
  ],
};
