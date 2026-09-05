
## Input

```javascript
function readParameter({['parameter-key']: parameter}) {
  return parameter;
}

function Component(props) {
  const {['declaration-key']: declared} = props;
  const {
    nested: {['nested-key']: nested},
  } = props;
  let reassigned;
  ({['assignment-key']: reassigned} = props);

  return [declared, reassigned, readParameter(props), nested];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      'declaration-key': 1,
      'assignment-key': 2,
      'parameter-key': 3,
      nested: {'nested-key': 4},
    },
  ],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function readParameter(t0) {
  const { "parameter-key": parameter } = t0;
  return parameter;
}

function Component(props) {
  const $ = _c(7);
  const { "declaration-key": declared } = props;
  const { nested: t0 } = props;
  const { "nested-key": nested } = t0;
  let reassigned;
  ({ "assignment-key": reassigned } = props);

  const t1 = reassigned;
  let t2;
  if ($[0] !== props) {
    t2 = readParameter(props);
    $[0] = props;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  let t3;
  if (
    $[2] !== declared ||
    $[3] !== nested ||
    $[4] !== reassigned ||
    $[5] !== t2
  ) {
    t3 = [declared, t1, t2, nested];
    $[2] = declared;
    $[3] = nested;
    $[4] = reassigned;
    $[5] = t2;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      "declaration-key": 1,
      "assignment-key": 2,
      "parameter-key": 3,
      nested: { "nested-key": 4 },
    },
  ],

  isComponent: true,
};

```
      
### Eval output
(kind: ok) [1,2,3,4]