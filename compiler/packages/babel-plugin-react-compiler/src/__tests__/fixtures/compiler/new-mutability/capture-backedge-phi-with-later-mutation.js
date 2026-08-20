// @enableNewMutationAliasingModel
import {arrayPush, Stringify} from 'shared-runtime';

function Component({prop1, prop2}) {
  'use memo';

  let x = [{value: prop1}];
  let z;
  while (x.length < 2) {
    // there's a phi here for x (value before the loop and the reassignment later)

    // this mutation occurs before the reassigned value
    arrayPush(x, {value: prop2});

    if (x[0].value === prop1) {
      x = [{value: prop2}];
      const y = x;
      z = y[0];
    }
  }
  z.other = true;
  return <Stringify z={z} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop1: 0, prop2: 'a'}],
  sequentialRenders: [
    {prop1: 0, prop2: 'a'},
    {prop1: 1, prop2: 'a'},
    {prop1: 1, prop2: 'b'},
    {prop1: 0, prop2: 'b'},
    {prop1: 0, prop2: 'a'},
  ],
};
