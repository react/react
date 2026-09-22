// @gating
import {memo} from 'react';

export default memo(Foo);
function Foo(a) {
  'use memo';
  return `${arguments.length}:${a}:${arguments[1]}:${arguments[2]}`;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Foo'),
  params: ['first', 'second', 2],
};
