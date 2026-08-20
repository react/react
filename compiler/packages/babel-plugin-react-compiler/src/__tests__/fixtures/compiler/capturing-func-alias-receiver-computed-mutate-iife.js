import {mutate} from 'shared-runtime';

function component(a) {
  let x = {a};
  let y = {};
  (function () {
    let a = y;
    a['x'] = x;
  })();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['foo'],
};
