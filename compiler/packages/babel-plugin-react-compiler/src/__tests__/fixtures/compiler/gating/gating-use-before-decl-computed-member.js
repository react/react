// @gating
import {Stringify} from 'shared-runtime';

const registry = {};

export default registry[Foo];
function Foo({prop1, prop2}) {
  'use memo';
  return <Stringify prop1={prop1} prop2={prop2} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('Foo'),
  params: [{prop1: 1, prop2: 2}],
};
