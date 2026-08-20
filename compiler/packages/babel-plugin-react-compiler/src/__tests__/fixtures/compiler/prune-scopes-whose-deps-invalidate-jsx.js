import {useHook} from 'shared-runtime';

function Component(props) {
  const o = {};
  const x = <div>{props.value}</div>; // create within the range of x to group with x
  useHook(); // intersperse a hook call to prevent memoization of x
  o.value = props.value;

  const y = <div>{x}</div>;

  return <div>{y}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'sathya'}],
};
