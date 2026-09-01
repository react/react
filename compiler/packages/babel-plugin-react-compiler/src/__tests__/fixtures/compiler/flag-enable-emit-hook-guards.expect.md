
## Input

```javascript
// @enableEmitHookGuards
import {createContext, useContext, useEffect, useState} from 'react';
import {
  CONST_STRING0,
  ObjectWithHooks,
  getNumber,
  identity,
  print,
} from 'shared-runtime';

const MyContext = createContext('my context value');
function Component({value}) {
  print(identity(CONST_STRING0));
  const [state, setState] = useState(getNumber());
  print(value, state);
  useEffect(() => {
    if (state === 4) {
      setState(5);
    }
  }, [state]);
  print(identity(value + state));
  return ObjectWithHooks.useIdentity(useContext(MyContext));
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  args: [{value: 0}],
};

```

## Code

```javascript
import { $dispatcherGuard } from "react-compiler-runtime";
import { c as _c } from "react/compiler-runtime"; // @enableEmitHookGuards
import { createContext, useContext, useEffect, useState } from "react";
import {
  CONST_STRING0,
  ObjectWithHooks,
  getNumber,
  identity,
  print,
} from "shared-runtime";

const MyContext = createContext("my context value");
function Component(t0) {
  const $ = _c(4);
  try {
    $dispatcherGuard(0);
    const { value } = t0;
    print(identity(CONST_STRING0));
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = getNumber();
      $[0] = t1;
    } else {
      t1 = $[0];
    }
    const [state, setState] = (function () {
      try {
        $dispatcherGuard(2);
        return useState(t1);
      } finally {
        $dispatcherGuard(3);
      }
    })();
    print(value, state);
    let t2;
    let t3;
    if ($[1] !== state) {
      t2 = () => {
        if (state === 4) {
          setState(5);
        }
      };
      t3 = [state];
      $[1] = state;
      $[2] = t2;
      $[3] = t3;
    } else {
      t2 = $[2];
      t3 = $[3];
    }
    (function () {
      try {
        $dispatcherGuard(2);
        return useEffect(t2, t3);
      } finally {
        $dispatcherGuard(3);
      }
    })();
    print(identity(value + state));
    return (function () {
      try {
        $dispatcherGuard(2);
        return ObjectWithHooks.useIdentity(
          (function () {
            try {
              $dispatcherGuard(2);
              return useContext(MyContext);
            } finally {
              $dispatcherGuard(3);
            }
          })(),
        );
      } finally {
        $dispatcherGuard(3);
      }
    })();
  } finally {
    $dispatcherGuard(1);
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  args: [{ value: 0 }],
};

```
      