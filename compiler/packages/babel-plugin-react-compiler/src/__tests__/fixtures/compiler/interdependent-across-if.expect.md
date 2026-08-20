
## Input

```javascript
function compute() {}
function foo() {}
function Foo() {}

/**
 * Should produce 1 scope:
 *
 * return: inputs=props.a & props.b & props.c; outputs=return
 *   const a = compute(props.a);
 *   const b = compute(props.b);
 *   if (props.c)
 *     foo(a, b);
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const a = compute(props.a);
  const b = compute(props.b);
  if (props.c) {
    foo(a, b);
  }
  return <Foo a={a} b={b} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function compute() {}
function foo() {}
function Foo() {}

/**
 * Should produce 1 scope:
 *
 * return: inputs=props.a & props.b & props.c; outputs=return
 *   const a = compute(props.a);
 *   const b = compute(props.b);
 *   if (props.c)
 *     foo(a, b);
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const $ = _c(8);
  let a;
  let b;
  if ($[0] !== props.a || $[1] !== props.b || $[2] !== props.c) {
    a = compute(props.a);
    b = compute(props.b);
    if (props.c) {
      foo(a, b);
    }
    $[0] = props.a;
    $[1] = props.b;
    $[2] = props.c;
    $[3] = a;
    $[4] = b;
  } else {
    a = $[3];
    b = $[4];
  }
  let t0;
  if ($[5] !== a || $[6] !== b) {
    t0 = <Foo a={a} b={b} />;
    $[5] = a;
    $[6] = b;
    $[7] = t0;
  } else {
    t0 = $[7];
  }
  return t0;
}

```
      