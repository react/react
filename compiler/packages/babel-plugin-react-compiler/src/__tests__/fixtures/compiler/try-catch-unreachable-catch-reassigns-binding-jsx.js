// JSX variant of try-catch-unreachable-catch-reassigns-binding: the pruned
// catch conditionally reassigns `n`, leaving a phi operand from a removed
// block in the join after the try/catch. The component must still render.
function Component(props) {
  let n = 0;
  try {
    const x = 1;
  } catch (e) {
    if (e) {
      n = 1;
    }
  }
  n = n + 1;
  return <div>{n}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
