// @gating
import * as React from 'react';

/**
 * Test that the correct `Foo` is printed
 */
let Foo = () => <div>hello world 1!</div>;
const MemoOne = React.memo(Foo);
Foo = () => <div>hello world 2!</div>;
const MemoTwo = React.memo(Foo);

export const FIXTURE_ENTRYPOINT = {
  fn: () => {
    'use no memo';
    return (
      <>
        <MemoOne />
        <MemoTwo />
      </>
    );
  },
  params: [],
};
