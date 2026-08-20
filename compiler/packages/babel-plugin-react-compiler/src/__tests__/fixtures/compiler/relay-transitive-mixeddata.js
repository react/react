import {useFragment} from 'shared-runtime';

/**
 * React compiler should infer that the returned value is a primitive and avoid
 * memoizing it.
 */
function useRelayData({query, idx}) {
  'use memo';
  const data = useFragment('', query);
  return data.a[idx].toString();
}

export const FIXTURE_ENTRYPOINT = {
  fn: useRelayData,
  params: [{query: '', idx: 0}],
  sequentialRenders: [
    {query: '', idx: 0},
    {query: '', idx: 0},
    {query: '', idx: 1},
  ],
};
