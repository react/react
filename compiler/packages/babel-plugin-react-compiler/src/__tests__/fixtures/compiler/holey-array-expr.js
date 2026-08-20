import {CONST_STRING0} from 'shared-runtime';

function t(props) {
  let x = [, CONST_STRING0, props];
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: [{a: 1, b: 2}],
  isComponent: false,
};
