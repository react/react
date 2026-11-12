
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({flag}) {
  const target = {or: 0, and: 1, nullish: null};
  const calls = [];
  function getObject(name) {
    calls.push(name);
    return target;
  }
  function key() {
    calls.push('key');
    return 'and';
  }
  const logical = flag && (getObject('logical').or ||= 1);
  const conditional = flag ? (getObject('conditional')[key()] &&= 2) : 0;
  const nested = (getObject('outer').nullish ??= getObject('inner').or ||= 3);
  return (
    <Stringify
      target={target}
      calls={calls}
      logical={logical}
      conditional={conditional}
      nested={nested}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{flag: false}],
  sequentialRenders: [{flag: false}, {flag: true}, {flag: true}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

function Component(t0) {
  const $ = _c(17);

  let t1;
  let t2;
  let t3;
  let t4;
  let t5;
  const { flag } = t0;
  let calls;
  let conditional;
  let logical;
  let t6;
  let target;
  if ($[0] !== flag) {
    target = { or: 0, and: 1, nullish: null };
    calls = [];
    const getObject = function getObject(name) {
      calls.push(name);
      return target;
    };
    const key = function key() {
      calls.push("key");
      return "and";
    };
    logical = flag && (((t1 = getObject("logical")), t1.or) || (t1.or = 1));
    conditional = flag
      ? ((t2 = getObject("conditional")), (t3 = key()), t2[t3]) && (t2[t3] = 2)
      : 0;
    t6 =
      ((t4 = getObject("outer")), t4.nullish) ??
      (t4.nullish = ((t5 = getObject("inner")), t5.or) || (t5.or = 3));
    $[0] = flag;
    $[1] = calls;
    $[2] = conditional;
    $[3] = logical;
    $[4] = t6;
    $[5] = target;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
    $[9] = t4;
    $[10] = t5;
  } else {
    calls = $[1];
    conditional = $[2];
    logical = $[3];
    t6 = $[4];
    target = $[5];
    t1 = $[6];
    t2 = $[7];
    t3 = $[8];
    t4 = $[9];
    t5 = $[10];
  }
  const nested = t6;
  let t7;
  if (
    $[11] !== calls ||
    $[12] !== conditional ||
    $[13] !== logical ||
    $[14] !== nested ||
    $[15] !== target
  ) {
    t7 = (
      <Stringify
        target={target}
        calls={calls}
        logical={logical}
        conditional={conditional}
        nested={nested}
      />
    );
    $[11] = calls;
    $[12] = conditional;
    $[13] = logical;
    $[14] = nested;
    $[15] = target;
    $[16] = t7;
  } else {
    t7 = $[16];
  }
  return t7;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ flag: false }],
  sequentialRenders: [{ flag: false }, { flag: true }, { flag: true }],
};

```
      
### Eval output
(kind: ok) <div>{"target":{"or":3,"and":1,"nullish":3},"calls":["outer","inner"],"logical":false,"conditional":0,"nested":3}</div>
<div>{"target":{"or":1,"and":2,"nullish":1},"calls":["logical","conditional","key","outer","inner"],"logical":1,"conditional":2,"nested":1}</div>
<div>{"target":{"or":1,"and":2,"nullish":1},"calls":["logical","conditional","key","outer","inner"],"logical":1,"conditional":2,"nested":1}</div>