
## Input

```javascript
// @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34342
 * Accessing both `props.ref` and a non-ref sibling property (here
 * `props.value`) on the same props object should not raise a ref
 * validation error on the sibling read.
 */
function Component(props) {
  return <div ref={props.ref}>{props.value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 'hello'}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34342
 * Accessing both `props.ref` and a non-ref sibling property (here
 * `props.value`) on the same props object should not raise a ref
 * validation error on the sibling read.
 */
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.ref || $[1] !== props.value) {
    t0 = <div ref={props.ref}>{props.value}</div>;
    $[0] = props.ref;
    $[1] = props.value;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ value: "hello" }],
};

```
      
### Eval output
(kind: ok) <div>hello</div>