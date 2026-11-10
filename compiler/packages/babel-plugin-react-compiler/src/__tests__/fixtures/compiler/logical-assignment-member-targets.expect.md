
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({value}) {
  const obj = {x: value, a: 0, full: 1};
  const calls = {key: 0, rhs: 0};
  function key() {
    calls.key += 1;
    return 'a';
  }
  function rhs(result) {
    calls.rhs += 1;
    return result;
  }
  // Nullish target: assigns, evaluating the right side once
  obj.x ??= rhs('fallback');
  // Computed target: key() must evaluate exactly once
  obj[key()] ||= rhs('updated');
  // Non-nullish target: skips the assignment without evaluating the right side
  const skipped = (obj.full ??= rhs('skipped'));
  return <Stringify obj={obj} calls={calls} skipped={skipped} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(12);

  let t1;

  let t2;
  let t3;

  let t4;
  const { value } = t0;
  let calls;
  let obj;
  let t5;
  if ($[0] !== value) {
    obj = { x: value, a: 0, full: 1 };
    calls = { key: 0, rhs: 0 };
    const key = function key() {
      calls.key = calls.key + 1;
      return "a";
    };
    const rhs = function rhs(result) {
      calls.rhs = calls.rhs + 1;
      return result;
    };
    ((t1 = obj), t1.x) ?? (t1.x = rhs("fallback"));
    ((t2 = obj), (t3 = key()), t2[t3]) || (t2[t3] = rhs("updated"));
    t5 = ((t4 = obj), t4.full) ?? (t4.full = rhs("skipped"));
    $[0] = value;
    $[1] = calls;
    $[2] = obj;
    $[3] = t5;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
    $[7] = t4;
  } else {
    calls = $[1];
    obj = $[2];
    t5 = $[3];
    t1 = $[4];
    t2 = $[5];
    t3 = $[6];
    t4 = $[7];
  }
  const skipped = t5;
  let t6;
  if ($[8] !== calls || $[9] !== obj || $[10] !== skipped) {
    t6 = <Stringify obj={obj} calls={calls} skipped={skipped} />;
    $[8] = calls;
    $[9] = obj;
    $[10] = skipped;
    $[11] = t6;
  } else {
    t6 = $[11];
  }
  return t6;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: null }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"x":"fallback","a":"updated","full":1},"calls":{"key":1,"rhs":2},"skipped":1}</div>