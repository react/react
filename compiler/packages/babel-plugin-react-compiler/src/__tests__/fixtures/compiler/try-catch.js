const {throwErrorWithMessage} = require('shared-runtime');

function Component(props) {
  let x;
  try {
    x = throwErrorWithMessage('oops');
  } catch {
    x = null;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
