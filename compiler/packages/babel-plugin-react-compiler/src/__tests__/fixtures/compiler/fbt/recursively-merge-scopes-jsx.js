// @flow
import {fbt} from 'fbt';

function Example({x}) {
  // "Inner Text" needs to be visible to fbt: the <Bar> element cannot
  // be memoized separately
  return (
    <fbt desc="Description">
      Outer Text
      <Foo key="b" x={x}>
        <Bar key="a">Inner Text</Bar>
      </Foo>
    </fbt>
  );
}

function Foo({x, children}) {
  'use no memo';
  return (
    <>
      <div>{x}</div>
      <span>{children}</span>
    </>
  );
}

function Bar({children}) {
  'use no memo';
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Example,
  params: [{x: 'Hello'}],
};
