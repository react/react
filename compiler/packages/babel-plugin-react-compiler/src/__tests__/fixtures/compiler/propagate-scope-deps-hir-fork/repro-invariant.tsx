// @enablePropagateDepsInHIR
import {Stringify} from 'shared-runtime';

function Foo({data}) {
  return (
    <Stringify foo={() => data.a.d} bar={data.a?.b.c} shouldInvokeFns={true} />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{data: {a: null}}],
  sequentialRenders: [{data: {a: {b: {c: 4}}}}],
};
