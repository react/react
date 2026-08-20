
## Input

```javascript
/**
 * Should produce 1 scope:
 *
 * return: inputs=props.a & props.b; outputs=return
 *   const a = compute(props.a);
 *   const b = compute(props.b);
 *   foo(a, b);
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const a = compute(props.a);
  const b = compute(props.b);
  foo(a, b);
  return <Foo a={a} b={b} />;
}

function compute() {}
function foo() {}
function Foo() {}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Should produce 1 scope:
 *
 * return: inputs=props.a & props.b; outputs=return
 *   const a = compute(props.a);
 *   const b = compute(props.b);
 *   foo(a, b);
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const $ = _c(7);
  let a;
  let b;
  if ($[0] !== props.a || $[1] !== props.b) {
    a = compute(props.a);
    b = compute(props.b);
    foo(a, b);
    $[0] = props.a;
    $[1] = props.b;
    $[2] = a;
    $[3] = b;
  } else {
    a = $[2];
    b = $[3];
  }
  let t0;
  if ($[4] !== a || $[5] !== b) {
    t0 = <Foo a={a} b={b} />;
    $[4] = a;
    $[5] = b;
    $[6] = t0;
  } else {
    t0 = $[6];
  }
  return t0;
}

function compute() {}
function foo() {}
function Foo() {}

```
      