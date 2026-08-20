// @flow
import {Stringify} from 'shared-runtime';

/**
 * Assume that functions captured directly as jsx attributes are invoked and
 * that their property loads are hoistable.
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
