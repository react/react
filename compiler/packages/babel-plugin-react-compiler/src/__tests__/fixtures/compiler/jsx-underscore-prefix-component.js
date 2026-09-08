// Test that JSX tags starting with `_` or `$` are treated as component
// references (not host/builtin elements). JSX semantics: any tag NOT starting
// with a lowercase letter is a component reference.

import {Stringify} from 'shared-runtime';

const _Bar = Stringify;

function Component(props) {
  return <_Bar value={props.value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
