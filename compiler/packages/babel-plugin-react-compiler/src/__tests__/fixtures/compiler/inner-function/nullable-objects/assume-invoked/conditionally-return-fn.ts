import {createHookWrapper} from 'shared-runtime';

/**
 * Conditionally returned functions do not run during render, so their property
 * loads are not hoistable to the function declaration site.
 */
function useMakeCallback({
  obj,
  shouldMakeCb,
  setState,
}: {
  obj: {value: number};
  shouldMakeCb: boolean;
  setState: (newState: number) => void;
}) {
  const cb = () => setState(obj.value);
  if (shouldMakeCb) return cb;
  else return null;
}

const setState = (arg: number) => {
  'use no memo';
  return arg;
};
export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useMakeCallback),
  params: [{obj: {value: 1}, shouldMakeCb: true, setState}],
  sequentialRenders: [
    {obj: {value: 1}, shouldMakeCb: true, setState},
    {obj: {value: 2}, shouldMakeCb: true, setState},
  ],
};
