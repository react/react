import {Stringify} from 'shared-runtime';

function Foo({a, shouldReadA}) {
  return (
    <Stringify
      fn={() => {
        if (shouldReadA) return a.b.c;
        return null;
      }}
      shouldInvokeFns={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: null, shouldReadA: true}],
  sequentialRenders: [
    {a: null, shouldReadA: true},
    {a: null, shouldReadA: false},
    {a: {b: {c: 4}}, shouldReadA: true},
  ],
};
