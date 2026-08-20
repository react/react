import {Stringify} from 'shared-runtime';

function Component(props) {
  const {a} = props;
  const {b, ...rest} = a;
  // Local mutation of `rest` is allowed since it is a newly allocated object
  rest.value = props.value;
  return <Stringify rest={rest} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {b: 0, other: 'other'}, value: 42}],
};
