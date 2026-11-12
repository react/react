
## Input

```javascript
// @flow
import {Stringify} from 'shared-runtime';

/**
 * Example fixture demonstrating a case where we could hoist dependencies
 * and reuse them across scopes. Here we extract a temporary for `item.value`
 * and reference it both in the scope for `a`. Then the scope for `c` could
 * use `<item-value-temp>.inner` as its dependency, avoiding reloading
 * `item.value`.
 */
function Test({item, index}: {item: {value: {inner: any}}, index: number}) {
  // These scopes have the same dependency, `item.value`, and could
  // share a hoisted expression to evaluate it
  const a = [];
  if (index) {
    a.push({value: item.value, index});
  }
  const b = [item.value];

  // This dependency is more precise (nested property), the outer
  // `item.value` portion could use a hoisted dep for `item.value
  const c = [item.value.inner];
  return <Stringify value={[a, b, c]} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Test(t0) {
  const $ = _c(11);
  const { item, index } = t0;
  let a;
  if ($[0] !== index || $[1] !== item.value) {
    a = [];
    if (index) {
      a.push({ value: item.value, index });
    }
    $[0] = index;
    $[1] = item.value;
    $[2] = a;
  } else {
    a = $[2];
  }
  let t1;
  if ($[3] !== item.value) {
    t1 = [item.value];
    $[3] = item.value;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  const b = t1;
  let t2;
  if ($[5] !== item.value.inner) {
    t2 = [item.value.inner];
    $[5] = item.value.inner;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  const c = t2;
  let t3;
  if ($[7] !== a || $[8] !== b || $[9] !== c) {
    t3 = <Stringify value={[a, b, c]} />;
    $[7] = a;
    $[8] = b;
    $[9] = c;
    $[10] = t3;
  } else {
    t3 = $[10];
  }
  return t3;
}

```
      
### Eval output
(kind: exception) Fixture not implemented