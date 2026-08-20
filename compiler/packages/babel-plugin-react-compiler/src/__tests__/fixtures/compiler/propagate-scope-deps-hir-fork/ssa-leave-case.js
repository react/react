// @enablePropagateDepsInHIR
import {Stringify} from 'shared-runtime';

function Component(props) {
  let x = [];
  let y;
  if (props.p0) {
    x.push(props.p1);
    y = x;
  }
  return (
    <Stringify>
      {x}
      {y}
    </Stringify>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{p0: false, p1: 2}],
  sequentialRenders: [
    {p0: false, p1: 2},
    {p0: false, p1: 2},
    {p0: true, p1: 2},
    {p0: true, p1: 3},
  ],
};
