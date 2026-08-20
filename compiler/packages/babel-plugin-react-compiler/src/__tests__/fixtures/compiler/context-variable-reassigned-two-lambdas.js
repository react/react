import {conditionalInvoke} from 'shared-runtime';

function Component({doReassign1, doReassign2}) {
  let x = {};
  const reassign1 = () => {
    x = 2;
  };
  const reassign2 = () => {
    x = 3;
  };
  conditionalInvoke(doReassign1, reassign1);
  conditionalInvoke(doReassign2, reassign2);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{doReassign1: true, doReassign2: true}],
  sequentialRenders: [
    {doReassign1: true, doReassign2: true},
    {doReassign1: true, doReassign2: false},
    {doReassign1: false, doReassign2: false},
  ],
};
