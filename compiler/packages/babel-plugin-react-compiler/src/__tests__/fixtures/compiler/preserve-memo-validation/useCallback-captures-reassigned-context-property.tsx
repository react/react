// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

/**
 * TODO: we're currently bailing out because `contextVar` is a context variable
 * and not recorded into the PropagateScopeDeps LoadLocal / PropertyLoad
 * sidemap. Previously, we were able to avoid this as `BuildHIR` hoisted
 * `LoadContext` and `PropertyLoad` instructions into the outer function, which
 * we took as eligible dependencies.
 *
 * One solution is to simply record `LoadContext` identifiers into the
 * temporaries sidemap when the instruction occurs *after* the context
 * variable's mutable range.
 */
function Foo(props) {
  let contextVar;
  if (props.cond) {
    contextVar = {val: 2};
  } else {
    contextVar = {};
  }

  const cb = useCallback(() => [contextVar.val], [contextVar.val]);

  return <Stringify cb={cb} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: true}],
};
