// @flow
import {Stringify} from 'shared-runtime';

/**
 * Functions captured directly as jsx attributes (e.g. event handlers) do not run
 * during render, so their property loads are not hoistable.
 */
function useMakeCallback({
  obj,
  setState,
}: {
  obj: {value: number};
  setState: (newState: number) => void;
}) {
  return <Stringify cb={() => setState(obj.value)} shouldInvokeFns={true} />;
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: useMakeCallback,
  params: [{obj: {value: 1}, setState}],
  sequentialRenders: [
    {obj: {value: 1}, setState},
    {obj: {value: 2}, setState},
  ],
};
