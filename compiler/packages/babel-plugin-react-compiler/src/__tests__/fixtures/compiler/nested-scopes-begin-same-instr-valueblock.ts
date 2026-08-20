import {identity, mutate} from 'shared-runtime';

function Foo({cond}) {
  const x = identity(identity(cond)) ? {a: 2} : {b: 2};

  mutate(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{cond: false}],
  sequentialRenders: [{cond: false}, {cond: false}, {cond: true}, {cond: true}],
};
