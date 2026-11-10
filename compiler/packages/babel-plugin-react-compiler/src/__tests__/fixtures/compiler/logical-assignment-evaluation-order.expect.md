
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component() {
  const action = () => {
    const calls = [];
    const target = {x: 0, y: null, z: 1, full: 1};
    function before() {
      calls.push('before');
      return calls.length;
    }
    function getObject(name) {
      calls.push(name);
      return target;
    }
    function key() {
      calls.push('key');
      return 'y';
    }
    function rhs() {
      calls.push('rhs');
      return 7;
    }
    function consume(first, second) {
      calls.push('consume');
      return [first, second];
    }
    const property = consume(before(), (getObject('property').x ||= rhs()));
    const computed = consume(
      before(),
      (getObject('computed')[key()] ??= rhs())
    );
    const binary = before() + (getObject('binary').z &&= rhs());
    const skipped = consume(before(), (getObject('skip').full ||= rhs()));
    return {calls, property, computed, binary, skipped, target};
  };
  return <Stringify action={action} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component() {
  const $ = _c(1);
  const action = _temp;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Stringify action={action} shouldInvokeFns={true} />;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp() {
  let t0;
  let t1;
  let t2;
  let t3;
  let t4;
  const calls = [];
  const target = { x: 0, y: null, z: 1, full: 1 };
  const before = function before() {
    calls.push("before");
    return calls.length;
  };
  const getObject = function getObject(name) {
    calls.push(name);
    return target;
  };
  const key = function key() {
    calls.push("key");
    return "y";
  };
  const rhs = function rhs() {
    calls.push("rhs");
    return 7;
  };
  const consume = function consume(first, second) {
    calls.push("consume");
    return [first, second];
  };
  const property = consume(
    before(),
    ((t0 = getObject("property")), t0.x) || (t0.x = rhs()),
  );
  const computed = consume(
    before(),
    ((t1 = getObject("computed")), (t2 = key()), t1[t2]) ?? (t1[t2] = rhs()),
  );
  const binary =
    before() + (((t3 = getObject("binary")), t3.z) && (t3.z = rhs()));
  const skipped = consume(
    before(),
    ((t4 = getObject("skip")), t4.full) || (t4.full = rhs()),
  );
  return { calls, property, computed, binary, skipped, target };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>{"action":{"kind":"Function","result":{"calls":["before","property","rhs","consume","before","computed","key","rhs","consume","before","binary","rhs","before","skip","consume"],"property":[1,7],"computed":[5,7],"binary":17,"skipped":[13,1],"target":{"x":7,"y":7,"z":7,"full":1}}},"shouldInvokeFns":true}</div>