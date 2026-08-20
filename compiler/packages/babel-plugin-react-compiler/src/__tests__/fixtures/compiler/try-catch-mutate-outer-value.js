const {shallowCopy, throwErrorWithMessage} = require('shared-runtime');

function Component(props) {
  const x = [];
  try {
    x.push(throwErrorWithMessage('oops'));
  } catch {
    x.push(shallowCopy({a: props.a}));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
};
