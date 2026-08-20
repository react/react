const {throwInput} = require('shared-runtime');

function Component(props) {
  try {
    const y = [];
    y.push(props.y);
    throwInput(y);
  } catch (e) {
    e.push(props.e);
    return e;
  }
  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 'foo', e: 'bar'}],
};
