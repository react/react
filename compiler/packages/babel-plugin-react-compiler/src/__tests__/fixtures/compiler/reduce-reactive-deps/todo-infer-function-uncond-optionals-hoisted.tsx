import {Stringify} from 'shared-runtime';

function useFoo({a}) {
  return <Stringify fn={() => a.b?.c.d?.e} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [
    {a: null},
    {a: {b: null}},
    {a: {b: {c: {d: null}}}},
    {a: {b: {c: {d: {e: 4}}}}},
  ],
};
