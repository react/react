// @gating
import {createRef, forwardRef} from 'react';
import {Stringify} from 'shared-runtime';

const Foo = forwardRef(Foo_withRef);
function Foo_withRef(props, ref) {
  return <Stringify ref={ref} {...props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('(...args) => React.createElement(Foo, args)'),
  params: [{prop1: 1, prop2: 2, ref: createRef()}],
};
