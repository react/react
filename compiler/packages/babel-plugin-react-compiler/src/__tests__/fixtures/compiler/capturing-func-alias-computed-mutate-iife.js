const {mutate} = require('shared-runtime');

function component(a) {
  let x = {a};
  let y = {};
  (function () {
    y['x'] = x;
  })();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['foo'],
};
