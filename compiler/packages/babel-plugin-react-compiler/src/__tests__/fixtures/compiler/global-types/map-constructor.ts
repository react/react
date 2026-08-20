import {makeArray} from 'shared-runtime';

function useHook({el1, el2}) {
  const s = new Map();
  s.set(el1, makeArray(el1));
  s.set(el2, makeArray(el2));
  return s.size;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{el1: 1, el2: 'foo'}],
  sequentialRenders: [
    {el1: 1, el2: 'foo'},
    {el1: 2, el2: 'foo'},
  ],
};
