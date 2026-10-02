
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Repro for react/react#34232: Object.fromEntries() captures its argument
 * rather than mutating it. When the argument was modeled as
 * ConditionallyMutate, a local array passed to Object.fromEntries was
 * entangled into a single reactive scope with the result and their
 * consumers; with Capture, each value gets its own scope.
 */
function Component({a}) {
  const pairs = [['key', a]];
  const obj = Object.fromEntries(pairs);
  return <Stringify obj={obj} pairs={pairs} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

/**
 * Repro for react/react#34232: Object.fromEntries() captures its argument
 * rather than mutating it. When the argument was modeled as
 * ConditionallyMutate, a local array passed to Object.fromEntries was
 * entangled into a single reactive scope with the result and their
 * consumers; with Capture, each value gets its own scope.
 */
function Component(t0) {
  const $ = _c(7);
  const { a } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = [["key", a]];
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const pairs = t1;
  let t2;
  if ($[2] !== pairs) {
    t2 = Object.fromEntries(pairs);
    $[2] = pairs;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const obj = t2;
  let t3;
  if ($[4] !== obj || $[5] !== pairs) {
    t3 = <Stringify obj={obj} pairs={pairs} />;
    $[4] = obj;
    $[5] = pairs;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"key":42},"pairs":[["key",42]]}</div>