
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Test that JSX tags starting with `_` or `$` are treated as component
// references (not host/builtin elements). JSX semantics: any tag NOT starting
// with a lowercase letter is a component reference.

import { Stringify } from "shared-runtime";

const _Bar = Stringify;

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.value) {
    t0 = <_Bar value={props.value} />;
    $[0] = props.value;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"value":42}</div>