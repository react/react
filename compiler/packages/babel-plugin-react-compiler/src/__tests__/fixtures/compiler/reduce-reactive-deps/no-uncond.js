// When an object's properties are only read conditionally, we should

import {identity} from 'shared-runtime';

// track the base object as a dependency.
function useOnlyConditionalDependencies({props, cond}) {
  const x = {};
  if (identity(cond)) {
    x.b = props.a.b;
    x.c = props.a.b.c;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useOnlyConditionalDependencies,
  params: [{props: {a: {b: 2}}, cond: true}],
  sequentialRenders: [
    {props: {a: {b: 2}}, cond: true},
    {props: null, cond: false},
    // check we preserve nullthrows
    {props: {a: {b: {c: undefined}}}, cond: true},
    {props: {a: {b: undefined}}, cond: true},
    {props: {a: {b: {c: undefined}}}, cond: true},
    {props: undefined, cond: true},
  ],
};
