import {identity} from 'shared-runtime';

function Component(props) {
  let x;
  // Reassign `x` based on a reactive value, but inside a function expression
  // to make it a context variable
  const f = () => {
    if (props.cond) {
      x = 1;
    } else {
      x = 2;
    }
  };
  // Pass `f` through a function to prevent IIFE inlining optimizations
  const f2 = identity(f);
  f2();

  // The values assigned to `x` are non-reactive, but the value of `x`
  // depends on the "control" value `props.cond` which is reactive.
  // Therefore x should be treated as reactive too.
  return [x];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {cond: true},
    {cond: true},
    {cond: false},
    {cond: false},
    {cond: true},
    {cond: false},
    {cond: true},
    {cond: false},
  ],
};
