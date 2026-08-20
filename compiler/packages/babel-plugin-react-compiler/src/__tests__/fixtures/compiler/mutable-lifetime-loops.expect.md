
## Input

```javascript
function mutate(x, y) {
  'use no forget';
  if (x != null) {
    x.value = (x.value ?? 0) + 1;
  }
  if (y != null) {
    y.value = (y.value ?? 0) + 1;
  }
}
function cond(x) {
  'use no forget';
  return x.value > 5;
}

function testFunction(props) {
  let a = {};
  let b = {};
  let c = {};
  let d = {};
  while (true) {
    let z = a;
    a = b;
    b = c;
    c = d;
    d = z;
    mutate(a, b);
    if (cond(a)) {
      break;
    }
  }

  // all of these tests are seemingly readonly, since the values are never directly
  // mutated again. but they are all aliased by `d`, which is later modified, and
  // these are therefore mutable references:
  if (a) {
  }
  if (b) {
  }
  if (c) {
  }
  if (d) {
  }

  mutate(d, null);
  return {a, b, c, d};
}

export const FIXTURE_ENTRYPOINT = {
  fn: testFunction,
  params: [{}],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function mutate(x, y) {
  "use no forget";
  if (x != null) {
    x.value = (x.value ?? 0) + 1;
  }
  if (y != null) {
    y.value = (y.value ?? 0) + 1;
  }
}
function cond(x) {
  "use no forget";
  return x.value > 5;
}

function testFunction(props) {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    let a = {};
    let b = {};
    let c = {};
    let d = {};
    while (true) {
      const z = a;
      a = b;
      b = c;
      c = d;
      d = z;
      mutate(a, b);
      if (cond(a)) {
        break;
      }
    }
    if (a) {
    }
    if (b) {
    }
    if (c) {
    }
    if (d) {
    }
    mutate(d, null);
    t0 = { a, b, c, d };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: testFunction,
  params: [{}],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":{"value":6},"b":{"value":5},"c":{"value":4},"d":{"value":6}}