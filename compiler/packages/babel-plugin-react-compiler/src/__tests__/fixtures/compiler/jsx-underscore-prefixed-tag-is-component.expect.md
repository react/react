
## Input

```javascript
import {Stringify} from 'shared-runtime';

// Repro for #36601: an underscore-prefixed JSX tag (`<_Bar>`) is a component
// reference, not a host/builtin element. Before the fix, `lowerJsxElementName`
// used `/^[A-Z]/` to detect components, so `_Bar` (which is not A-Z) was lowered
// as a BuiltinTag — emitting the literal string tag "_Bar" instead of loading
// the `_Bar` binding. The compiled output below must reference the `_Bar`
// identifier (component), not a string tag.
function Foo({_Bar}: {_Bar: React.ComponentType<{children: React.ReactNode}>}) {
  return <_Bar>ok</_Bar>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{_Bar: Stringify}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

// Repro for #36601: an underscore-prefixed JSX tag (`<_Bar>`) is a component
// reference, not a host/builtin element. Before the fix, `lowerJsxElementName`
// used `/^[A-Z]/` to detect components, so `_Bar` (which is not A-Z) was lowered
// as a BuiltinTag — emitting the literal string tag "_Bar" instead of loading
// the `_Bar` binding. The compiled output below must reference the `_Bar`
// identifier (component), not a string tag.
function Foo(t0) {
  const $ = _c(2);
  const { _Bar } = t0;
  let t1;
  if ($[0] !== _Bar) {
    t1 = <_Bar>ok</_Bar>;
    $[0] = _Bar;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ _Bar: Stringify }],
};

```
      
### Eval output
(kind: ok) <div>{"children":"ok"}</div>