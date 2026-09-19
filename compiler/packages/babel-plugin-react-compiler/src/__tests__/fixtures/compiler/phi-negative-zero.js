import {Stringify} from 'shared-runtime';

function Component(props) {
  let value;
  if (props.neg) {
    value = -0;
  } else {
    value = 0;
  }
  return <Stringify recip={String(1 / value)} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{neg: false}],
  sequentialRenders: [{neg: false}, {neg: true}],
};
