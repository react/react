import {
  Stringify,
  makeObject_Primitives,
  mutate,
  mutateAndReturn,
} from 'shared-runtime';

function useFoo({data}) {
  let obj = null;
  let myDiv = null;
  label: {
    if (data.cond) {
      obj = makeObject_Primitives();
      if (data.cond1) {
        myDiv = <Stringify value={mutateAndReturn(obj)} />;
        break label;
      }
      mutate(obj);
    }
  }

  return myDiv;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{data: {cond: true, cond1: true}}],
  sequentialRenders: [
    {data: {cond: true, cond1: true}},
    {data: {cond: true, cond1: true}},
  ],
};
