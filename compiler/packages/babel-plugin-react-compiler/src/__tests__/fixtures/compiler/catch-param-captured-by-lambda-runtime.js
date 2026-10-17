import {throwErrorWithMessageIf} from 'shared-runtime';

// The catch param `e` is captured by a lambda. It is initialized before the
// catch body runs, so it must not be hoisted as a context variable.
function Component({shouldThrow}) {
  let message = 'ok';
  try {
    throwErrorWithMessageIf(shouldThrow, 'boom');
  } catch (e) {
    const getMessage = () => e.message;
    message = getMessage();
  }
  return <div>{message}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{shouldThrow: true}],
};
