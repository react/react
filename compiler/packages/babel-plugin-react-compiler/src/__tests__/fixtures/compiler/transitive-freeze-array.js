// @enablePreserveExistingMemoizationGuarantees
const {mutate} = require('shared-runtime');

function Component(props) {
  const x = {};
  const y = {};
  const items = [x, y];
  items.pop();
  <div>{items}</div>; // note: enablePreserveExistingMemoizationGuarantees only visits function expressions, not arrays, so this doesn't freeze x/y
  mutate(y); // ok! not part of `items` anymore bc of items.pop()
  return [x, y, items];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
