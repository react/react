/**
 * Regression for https://github.com/facebook/react/issues/38141
 *
 * A switch in the catch is the same dropped continuation as an if: the
 * fallthrough's predecessors are the case blocks, not the handler. Pruning
 * the unreachable catch must still emit the code after the try.
 */
function Component() {
  try {
    const x = 1;
  } catch (e) {
    switch (e) {
      case 1:
        break;
      default:
        break;
    }
  }
  return 'rendered';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
