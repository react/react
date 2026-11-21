
## Input

```javascript
import {useEffect} from 'react';

export function Foo() {
  useEffect(() => {
    try {
      doSomething();
    } catch ({status}) {
      log(status);
    }
  }, []);
}

export function Bar() {
  useEffect(() => {
    try {
      doSomething();
    } catch ([error]) {
      log(error);
    }
  }, []);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useEffect } from "react";

export function Foo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(_temp, t0);
}
function _temp() {
  try {
    doSomething();
  } catch (t0) {
    const { status } = t0;
    log(status);
  }
}

export function Bar() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  useEffect(_temp2, t0);
}
function _temp2() {
  try {
    doSomething();
  } catch (t0) {
    const [error] = t0;
    log(error);
  }
}

```
      
### Eval output
(kind: exception) Fixture not implemented