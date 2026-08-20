import {invoke} from 'shared-runtime';

function Component({shouldReassign}) {
  let x = null;
  const reassign = () => {
    if (shouldReassign) {
      x = 2;
    }
  };
  invoke(reassign);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{shouldReassign: true}],
  sequentialRenders: [{shouldReassign: false}, {shouldReassign: true}],
};
