import {identity} from 'shared-runtime';

function Component(props) {
  let [x] = props.value;
  const foo = () => {
    x = identity(props.value[0]);
  };
  foo();
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: [42]}],
};
