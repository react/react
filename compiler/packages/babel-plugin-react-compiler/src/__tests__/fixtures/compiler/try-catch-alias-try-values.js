const {throwInput} = require('shared-runtime');

function Component(props) {
  let y;
  let x = [];
  try {
    // throws x
    throwInput(x);
  } catch (e) {
    // e = x
    y = e; // y = x
  }
  y.push(null);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
