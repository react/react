
## Input

```javascript
import {makeArray, Stringify, useIdentity} from 'shared-runtime';

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 * Also see repro-returned-inner-fn-mutates-context
 */
function Foo({b}) {
  'use memo';

  const fnFactory = () => {
    /**
     * This returned function expression *is* a local value. But it might (1)
     * capture and mutate its context environment and (2) be called during
     * render.
     * Typing it with `freeze` effects would be incorrect as it would mean
     * inferring that calls to updaterFactory()() do not mutate its captured
     * context.
     */
    return () => {
      myVar = () => console.log('a');
    };
  };
  let myVar = () => console.log('b');
  useIdentity();

  const fn = fnFactory();
  const arr = makeArray(b);
  fn(arr);
  return <Stringify cb={myVar} value={arr} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{b: 1}],
  sequentialRenders: [{b: 1}, {b: 2}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { makeArray, Stringify, useIdentity } from "shared-runtime";

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 * Also see repro-returned-inner-fn-mutates-context
 */
function Foo(t0) {
  "use memo";
  const $ = _c(3);
  const { b } = t0;

  const fnFactory = () => () => {
    myVar = _temp;
  };
  let myVar = _temp2;
  useIdentity();

  const fn = fnFactory();
  const arr = makeArray(b);
  fn(arr);
  let t1;
  if ($[0] !== arr || $[1] !== myVar) {
    t1 = <Stringify cb={myVar} value={arr} shouldInvokeFns={true} />;
    $[0] = arr;
    $[1] = myVar;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
function _temp2() {
  return console.log("b");
}
function _temp() {
  return console.log("a");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ b: 1 }],
  sequentialRenders: [{ b: 1 }, { b: 2 }],
};

```
      
### Eval output
(kind: ok) <div>{"cb":{"kind":"Function"},"value":[1],"shouldInvokeFns":true}</div>
<div>{"cb":{"kind":"Function"},"value":[2],"shouldInvokeFns":true}</div>
logs: ['a','a']