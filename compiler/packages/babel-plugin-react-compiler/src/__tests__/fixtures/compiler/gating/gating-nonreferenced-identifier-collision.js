// @gating
import {identity, useHook as useRenamed} from 'shared-runtime';
const _ = {
  useHook: () => {},
};
identity(_.useHook);

function useHook() {
  useRenamed();
  return <div>hello world!</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{}],
};
