const {mutate} = require('shared-runtime');

function Component(props) {
  const x = {};
  const y = props.y;
  const z = [x, y];
  mutate(z);
  // x's object identity can change bc it co-mutates with z, which is reactive via props.y
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{y: 42}],
};
