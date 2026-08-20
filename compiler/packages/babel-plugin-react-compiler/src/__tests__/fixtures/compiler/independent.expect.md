
## Input

```javascript
/**
 * Should produce 3 scopes:
 *
 * a: inputs=props.a, outputs=a
 *   a = compute(props.a);
 * b: inputs=props.b, outputs=b
 *   b = compute(props.b);
 * return: inputs=a, b outputs=return
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const a = compute(props.a);
  const b = compute(props.b);
  return <Foo a={a} b={b} />;
}

function compute() {}
function foo() {}
function Foo() {}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Should produce 3 scopes:
 *
 * a: inputs=props.a, outputs=a
 *   a = compute(props.a);
 * b: inputs=props.b, outputs=b
 *   b = compute(props.b);
 * return: inputs=a, b outputs=return
 *   return = <Foo a={a} b={b} />
 */
function Component(props) {
  const $ = _c(7);
  let t0;
  if ($[0] !== props.a) {
    t0 = compute(props.a);
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const a = t0;
  let t1;
  if ($[2] !== props.b) {
    t1 = compute(props.b);
    $[2] = props.b;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const b = t1;
  let t2;
  if ($[4] !== a || $[5] !== b) {
    t2 = <Foo a={a} b={b} />;
    $[4] = a;
    $[5] = b;
    $[6] = t2;
  } else {
    t2 = $[6];
  }
  return t2;
}

function compute() {}
function foo() {}
function Foo() {}

```
      