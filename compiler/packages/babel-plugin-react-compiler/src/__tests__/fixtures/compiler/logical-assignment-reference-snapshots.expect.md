
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component() {
  const action = () => {
    let key = 'a';
    const keyed = {stored: 0, b: 0};
    Object.defineProperty(keyed, 'a', {
      get() {
        key = 'b';
        return 0;
      },
      set(value) {
        keyed.stored = value;
      },
    });
    const keyResult = (keyed[key] ||= 7);

    const original = {stored: 0};
    let object = original;
    Object.defineProperty(original, 'x', {
      get() {
        object = {x: 5};
        return null;
      },
      set(value) {
        original.stored = value;
      },
    });
    const objectResult = (object.x ??= 9);
    return {
      keyStored: keyed.stored,
      otherKey: keyed.b,
      key,
      keyResult,
      objectStored: original.stored,
      reboundObject: object.x,
      objectResult,
    };
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
  let key = "a";
  const keyed = { stored: 0, b: 0 };
  Object.defineProperty(keyed, "a", {
    get() {
      key = "b";
      return 0;
    },
    set(value) {
      keyed.stored = value;
    },
  });
  const keyResult = ((t0 = keyed), (t1 = key), t0[t1]) || (t0[t1] = 7);
  const original = { stored: 0 };
  let object = original;
  Object.defineProperty(original, "x", {
    get() {
      object = { x: 5 };
      return null;
    },
    set(value_0) {
      original.stored = value_0;
    },
  });
  const objectResult = ((t2 = object), t2.x) ?? (t2.x = 9);
  return {
    keyStored: keyed.stored,
    otherKey: keyed.b,
    key,
    keyResult,
    objectStored: original.stored,
    reboundObject: object.x,
    objectResult,
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) <div>{"action":{"kind":"Function","result":{"keyStored":7,"otherKey":0,"key":"b","keyResult":7,"objectStored":9,"reboundObject":5,"objectResult":9}},"shouldInvokeFns":true}</div>