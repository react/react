// @enableObjectIsComparison
import {makeArray} from 'shared-runtime';

function Component(props) {
  let x = [];
  if (props.cond) {
    x.push(props.a);
    return x;
  } else {
    return makeArray(props.b);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {cond: true, a: 42},
    {cond: true, a: 42},
    {cond: false, b: 3.14},
    {cond: false, b: 3.14},
  ],
};
