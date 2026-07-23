
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
  const $ = _c(8);
  const { value } = t0;
  let calls;
  let obj;
  let t1;
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
    obj.x ?? (obj.x = rhs("fallback"));
    const t2 = key();
    obj[t2] || (obj[t2] = rhs("updated"));
    t1 = obj.full ?? (obj.full = rhs("skipped"));
    $[0] = value;
    $[1] = calls;
    $[2] = obj;
    $[3] = t1;
  } else {
    calls = $[1];
    obj = $[2];
    t1 = $[3];
  }
  const skipped = t1;
  let t2;
  if ($[4] !== calls || $[5] !== obj || $[6] !== skipped) {
    t2 = <Stringify obj={obj} calls={calls} skipped={skipped} />;
    $[4] = calls;
    $[5] = obj;
    $[6] = skipped;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: null }],
};

```
      
### Eval output
(kind: ok) <div>{"obj":{"x":"fallback","a":"updated","full":1},"calls":{"key":1,"rhs":2},"skipped":1}</div>