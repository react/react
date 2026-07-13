
## Input

```javascript
// When a conditional dependency `props.a` is a subpath of an unconditional
// dependency `props.a.b`, we can access `props.a` while preserving program
// semantics (with respect to nullthrows).
// deps: {`props.a`, `props.a.b`} can further reduce to just `props.a`

import {identity} from 'shared-runtime';

// ordering of accesses should not matter
function useConditionalSubpath1(props, cond) {
  const x = {};
  x.b = props.a.b;
  if (identity(cond)) {
    x.a = props.a;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useConditionalSubpath1,
  params: [{a: {b: 3}}, false],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // When a conditional dependency `props.a` is a subpath of an unconditional
// dependency `props.a.b`, we can access `props.a` while preserving program
// semantics (with respect to nullthrows).
// deps: {`props.a`, `props.a.b`} can further reduce to just `props.a`

import { identity } from "shared-runtime";

// ordering of accesses should not matter
function useConditionalSubpath1(props, cond) {
  const $ = _c(3);
  let x;
  if ($[0] !== cond || $[1] !== props.a) {
    x = {};
    x.b = props.a.b;
    if (identity(cond)) {
      x.a = props.a;
    }
    $[0] = cond;
    $[1] = props.a;
    $[2] = x;
  } else {
    x = $[2];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useConditionalSubpath1,
  params: [{ a: { b: 3 } }, false],
};

```
      
### Eval output
(kind: ok) {"b":3}