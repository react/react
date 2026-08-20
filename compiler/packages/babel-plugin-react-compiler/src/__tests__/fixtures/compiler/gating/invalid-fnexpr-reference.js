// @gating
import * as React from 'react';

let Foo;
const MemoFoo = React.memo(Foo);
Foo = () => <div>hello world!</div>;

/**
 * Evaluate this fixture module to assert that compiler + original have the same
 * runtime error message.
 */
export const FIXTURE_ENTRYPOINT = {
  fn: () => {},
  params: [],
};
