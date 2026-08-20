import {invoke} from 'shared-runtime';

function Component({cond}) {
  let x = 2;
  const obj = {
    method(cond) {
      if (cond) {
        x = 4;
      }
    },
  };
  invoke(obj.method, cond);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};
