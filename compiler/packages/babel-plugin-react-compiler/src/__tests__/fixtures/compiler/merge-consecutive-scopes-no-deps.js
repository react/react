const {getNumber} = require('shared-runtime');

function Component(props) {
  // Two scopes: one for `getNumber()`, one for the object literal.
  // Neither has dependencies so they should merge
  return {session_id: getNumber()};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
