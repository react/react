const {throwInput} = require('shared-runtime');

function Component(props) {
  let x;
  try {
    const y = [];
    y.push(props.y);
    throwInput(y);
  } catch (e) {
    e.push(props.e);
    x = e;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 'foo', e: 'bar'}],
};
