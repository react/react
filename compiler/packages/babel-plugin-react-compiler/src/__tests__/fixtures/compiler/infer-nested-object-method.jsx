// @compilationMode:"infer"

import {Stringify} from 'shared-runtime';

function Test() {
  const context = {
    testFn() {
      // if it is an arrow function its work
      return () => 'test'; // it will break compile if returns an arrow fn
    },
  };

  return <Stringify value={context} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};
