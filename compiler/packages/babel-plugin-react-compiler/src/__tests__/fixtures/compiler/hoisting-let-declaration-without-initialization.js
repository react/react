import {CONST_NUMBER1, Stringify} from 'shared-runtime';

function useHook({cond}) {
  'use memo';
  const getX = () => x;

  let x;
  if (cond) {
    x = CONST_NUMBER1;
  }
  return <Stringify getX={getX} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => {},
  params: [{cond: true}],
  sequentialRenders: [{cond: true}, {cond: true}, {cond: false}],
};
