import {identity, invoke} from 'shared-runtime';

function Test() {
  const str = invoke(identity<string>, 'test');
  return str;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [],
};
