// Variant without control flow inside the catch: the join block after the
// try/catch has a phi whose second operand comes directly from the removed
// catch block. Previously tripped "Found a block with a single predecessor
// but where a phi has multiple (2) operands".
function Component() {
  let n = 0;
  try {
    const x = 1;
  } catch (e) {
    n = 1;
  }
  n = n + 1;
  return n;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};
