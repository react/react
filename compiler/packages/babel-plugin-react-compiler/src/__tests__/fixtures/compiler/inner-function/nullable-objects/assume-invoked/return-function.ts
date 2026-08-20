import {createHookWrapper} from 'shared-runtime';

/**
 * Assume that directly returned functions are invoked and that their property
 * loads are hoistable.
 */
function useMakeCallback({
  obj,
  setState,
}: {
  obj: {value: number};
  setState: (newState: number) => void;
}) {
  return () => setState(obj.value);
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{obj: {value: 1}, setState}],
  sequentialRenders: [
    {obj: {value: 1}, setState},
    {obj: {value: 2}, setState},
  ],
};
