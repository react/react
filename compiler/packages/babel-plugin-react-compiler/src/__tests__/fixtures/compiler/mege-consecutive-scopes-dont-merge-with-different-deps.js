const {getNumber, identity} = require('shared-runtime');

function Component(props) {
  // Two scopes: one for `getNumber()`, one for the object literal.
  // Neither has dependencies so they should merge
  return {a: getNumber(), b: identity(props.id), c: ['static']};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{id: 42}],
};
