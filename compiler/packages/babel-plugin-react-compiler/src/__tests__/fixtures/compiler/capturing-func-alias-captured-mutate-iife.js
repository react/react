const {mutate} = require('shared-runtime');

function component(foo, bar) {
  let x = {foo};
  let y = {bar};
  (function () {
    let a = {y};
    let b = x;
    a.x = b;
  })();
  mutate(y);
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['foo', 'bar'],
};
