// @validatePreserveExistingMemoizationGuarantees @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';

function Component({entity, children}) {
  const showMessage = useCallback(() => entity != null);

  // We currently model functions as if they could escape intor their return value
  // but if we ever changed that (or did optimization to figure out cases where they
  // are known not to) we could get a false positive validation error here, since
  // showMessage doesn't need to be memoized since it doesn't escape in this instance.
  const shouldShowMessage = showMessage();
  return (
    <div>
      <div>{shouldShowMessage}</div>
      <div>{children}</div>
    </div>
  );
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
