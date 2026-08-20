import {makeArray} from 'shared-runtime';

function Component(props) {
  let x = [];
  if (props.cond) {
    x.push(props.a);
    // oops no memo!
    return x;
  } else {
    return makeArray(props.b);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    // pattern 1
    {cond: true, a: 42},
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
    {cond: false, b: 3.14},
    // pattern 1
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
    // pattern 1
    {cond: true, a: 42},
    // pattern 2
    {cond: false, b: 3.14},
  ],
};
