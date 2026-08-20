// When an unconditional dependency `props.a` is the subpath of a conditional
// dependency `props.a.b`, we can safely overestimate and only track `props.a`
// as a dependency

import {identity} from 'shared-runtime';

// ordering of accesses should not matter
function useConditionalSuperpath1({props, cond}) {
  const x = {};
  x.a = props.a;
  if (identity(cond)) {
    x.b = props.a.b;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useConditionalSuperpath1,
  params: [{props: {a: null}, cond: false}],
  sequentialRenders: [
    {props: {a: null}, cond: false},
    {props: {a: {}}, cond: true},
    {props: {a: {b: 3}}, cond: true},
    {props: {}, cond: false},
    // test that we preserve nullthrows
    {props: {a: {b: undefined}}, cond: true},
    {props: {a: undefined}, cond: true},
  ],
};
