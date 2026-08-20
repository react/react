import {shallowCopy} from 'shared-runtime';

function Component(props) {
  const x = shallowCopy(props);
  // These calls should view x as readonly and be grouped outside of the reactive scope for x:
  console.log(x);
  console.info(x);
  console.warn(x);
  console.error(x);
  console.trace(x);
  console.table(x);
  global.console.log(x);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 2}],
  isComponent: false,
};
