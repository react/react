const {getNumber} = require('shared-runtime');

function Component(props) {
  let x;
  // Two scopes: one for `getNumber()`, one for the object literal.
  // Neither has dependencies so they should merge
  if (props.cond) {
    x = {session_id: getNumber()};
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true}],
};
