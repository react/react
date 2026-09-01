
## Input

```javascript
import {Stringify} from 'shared-runtime';

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 */
function Foo({a, b}) {
  'use memo';
  const obj = {};
  const updaterFactory = () => {
    /**
     * This returned function expression *is* a local value. But it might (1)
     * capture and mutate its context environment and (2) be called during
     * render.
     * Typing it with `freeze` effects would be incorrect as it would mean
     * inferring that calls to updaterFactory()() do not mutate its captured
     * context.
     */
    return newValue => {
      obj.value = newValue;
      obj.a = a;
    };
  };

  const updater = updaterFactory();
  updater(b);
  return <Stringify cb={obj} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: 1, b: 2}],
  sequentialRenders: [
    {a: 1, b: 2},
    {a: 1, b: 3},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify } from "shared-runtime";

/**
 * Example showing that returned inner function expressions should not be
 * typed with `freeze` effects.
 */
function Foo(t0) {
  "use memo";
  const $ = _c(3);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b) {
    const obj = {};
    const updaterFactory = () => (newValue) => {
      obj.value = newValue;
      obj.a = a;
    };
    const updater = updaterFactory();
    updater(b);
    t1 = <Stringify cb={obj} shouldInvokeFns={true} />;
    $[0] = a;
    $[1] = b;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ a: 1, b: 2 }],
  sequentialRenders: [
    { a: 1, b: 2 },
    { a: 1, b: 3 },
  ],
};

```
      
### Eval output
(kind: ok) <div>{"cb":{"value":2,"a":1},"shouldInvokeFns":true}</div>
<div>{"cb":{"value":3,"a":1},"shouldInvokeFns":true}</div>