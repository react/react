const {throwErrorWithMessage, shallowCopy} = require('shared-runtime');

function Component(props) {
  const x = [];
  try {
    x.push(throwErrorWithMessage('oops'));
  } catch {
    x.push(shallowCopy({}));
  }
  x.push(props.value); // extend the mutable range to include the try/catch
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
