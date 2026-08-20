// @flow @gating
import {Stringify} from 'shared-runtime';
import * as React from 'react';

component Foo(ref: React.RefSetter<Controls>) {
  return <Stringify ref={ref} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('(...args) => React.createElement(Foo, args)'),
  params: [{ref: React.createRef()}],
};
