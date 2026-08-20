import {conditionalInvoke} from 'shared-runtime';

// same as context-variable-reactive-explicit-control-flow.js, but make
// the control flow implicit

function Component({shouldReassign}) {
  let x = null;
  const reassign = () => {
    x = 2;
  };
  conditionalInvoke(shouldReassign, reassign);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{shouldReassign: true}],
  sequentialRenders: [{shouldReassign: false}, {shouldReassign: true}],
};
