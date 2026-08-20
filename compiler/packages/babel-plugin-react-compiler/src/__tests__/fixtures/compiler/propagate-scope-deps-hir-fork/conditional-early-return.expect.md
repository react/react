
## Input

```javascript
// @enablePropagateDepsInHIR
/**
 * props.b does *not* influence `a`
 */
function ComponentA(props) {
  const a_DEBUG = [];
  a_DEBUG.push(props.a);
  if (props.b) {
    return null;
  }
  a_DEBUG.push(props.d);
  return a_DEBUG;
}

/**
 * props.b *does* influence `a`
 */
function ComponentB(props) {
  const a = [];
  a.push(props.a);
  if (props.b) {
    a.push(props.c);
  }
  a.push(props.d);
  return a;
}

/**
 * props.b *does* influence `a`, but only in a way that is never observable
 */
function ComponentC(props) {
  const a = [];
  a.push(props.a);
  if (props.b) {
    a.push(props.c);
    return null;
  }
  a.push(props.d);
  return a;
}

/**
 * props.b *does* influence `a`
 */
function ComponentD(props) {
  const a = [];
  a.push(props.a);
  if (props.b) {
    a.push(props.c);
    return a;
  }
  a.push(props.d);
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ComponentA,
  params: [{a: 1, b: false, d: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR
/**
 * props.b does *not* influence `a`
 */
function ComponentA(props) {
  const $ = _c(5);
  let a_DEBUG;
  let t0;
  if ($[0] !== props.a || $[1] !== props.b || $[2] !== props.d) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      a_DEBUG = [];
      a_DEBUG.push(props.a);
      if (props.b) {
        t0 = null;
        break bb0;
      }

      a_DEBUG.push(props.d);
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.d;
    $[3] = a_DEBUG;
    $[4] = t0;
  } else {
    a_DEBUG = $[3];
    t0 = $[4];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  return a_DEBUG;
}

/**
 * props.b *does* influence `a`
 */
function ComponentB(props) {
  const $ = _c(5);
  let a;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.c ||
    $[3] !== props.d
  ) {
    a = [];
    a.push(props.a);
    if (props.b) {
      a.push(props.c);
    }

    a.push(props.d);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = props.d;
    $[4] = a;
  } else {
    a = $[4];
  }
  return a;
}

/**
 * props.b *does* influence `a`, but only in a way that is never observable
 */
function ComponentC(props) {
  const $ = _c(6);
  let a;
  let t0;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.c ||
    $[3] !== props.d
  ) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      a = [];
      a.push(props.a);
      if (props.b) {
        a.push(props.c);
        t0 = null;
        break bb0;
      }

      a.push(props.d);
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = props.d;
    $[4] = a;
    $[5] = t0;
  } else {
    a = $[4];
    t0 = $[5];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  return a;
}

/**
 * props.b *does* influence `a`
 */
function ComponentD(props) {
  const $ = _c(6);
  let a;
  let t0;
  if (
    $[0] !== props.a ||
    $[1] !== props.b ||
    $[2] !== props.c ||
    $[3] !== props.d
  ) {
    t0 = Symbol.for("react.early_return_sentinel");
    bb0: {
      a = [];
      a.push(props.a);
      if (props.b) {
        a.push(props.c);
        t0 = a;
        break bb0;
      }

      a.push(props.d);
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = props.d;
    $[4] = a;
    $[5] = t0;
  } else {
    a = $[4];
    t0 = $[5];
  }
  if (t0 !== Symbol.for("react.early_return_sentinel")) {
    return t0;
  }
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ComponentA,
  params: [{ a: 1, b: false, d: 3 }],
};

```
      
### Eval output
(kind: ok) [1,3]