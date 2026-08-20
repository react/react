import {CONST_NUMBER0, CONST_NUMBER1, Stringify} from 'shared-runtime';

function useHook({cond}) {
  'use memo';
  const getX = () => x;

  let x = CONST_NUMBER0;
  if (cond) {
    x += CONST_NUMBER1;
    x = Math.min(x, 100);
  }
  return <Stringify getX={getX} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: true}, {cond: false}],
};
