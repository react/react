// @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
import {useCallback} from 'react';

function Component({entity, children}) {
  // showMessage doesn't escape so we don't memoize it.
  // However, validatePreserveExistingMemoizationGuarantees only sees that the scope
  // doesn't exist, and thinks the memoization was missed instead of being intentionally dropped.
  const showMessage = useCallback(() => entity != null, [entity]);

  if (!showMessage()) {
    return children;
  }

  return <div>{children}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      entity: {name: 'Sathya'},
      children: [<div key="gsathya">Hi Sathya!</div>],
    },
  ],
};
