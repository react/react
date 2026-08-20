
## Input

```javascript
function Component(props) {
  const x = [];
  const y = x;

  // y isn't reactive yet when we first visit this, so z is initially non-reactive
  const z = [y];

  // then we realize y is reactive. we need a fixpoint to propagate this back to z
  y.push(props.input);

  // PruneNonReactiveDependencies partially propagates reactivity (for now) which
  // we bypass with an indirection of storing into another variable
  const a = [z];

  // b's value is conditional on `a`, which is reactive per above
  let b = 0;
  if (a[0][0][0] === 42) {
    b = 1;
  }

  return [b];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    {input: 42},
    {input: 42},
    {input: 'sathya'},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
    {input: 42},
    {input: 'sathya'},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  const x = [];
  const y = x;

  const z = [y];

  y.push(props.input);

  const a = [z];

  let b = 0;
  if (a[0][0][0] === 42) {
    b = 1;
  }
  let t0;
  if ($[0] !== b) {
    t0 = [b];
    $[0] = b;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  sequentialRenders: [
    { input: 42 },
    { input: 42 },
    { input: "sathya" },
    { input: "sathya" },
    { input: 42 },
    { input: "sathya" },
    { input: 42 },
    { input: "sathya" },
  ],
};

```
      
### Eval output
(kind: ok) [1]
[1]
[0]
[0]
[1]
[0]
[1]
[0]