
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Repro for react/react#34232: Object.fromEntries() captures its argument
 * rather than mutating it. Modeling the argument as ConditionallyMutate
 * extends the argument's mutable range through the call, entangling the
 * argument, the result, and their consumers into a single reactive scope.
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
 * rather than mutating it. Modeling the argument as ConditionallyMutate
 * extends the argument's mutable range through the call, entangling the
 * argument, the result, and their consumers into a single reactive scope.
 */
function Component(t0) {
  const $ = _c(2);
  const { a } = t0;
  let t1;
  if ($[0] !== a) {
    const pairs = [["key", a]];
    const obj = Object.fromEntries(pairs);
    t1 = <Stringify obj={obj} pairs={pairs} />;
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 42 }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"key":42},"pairs":[["key",42]]}</div>