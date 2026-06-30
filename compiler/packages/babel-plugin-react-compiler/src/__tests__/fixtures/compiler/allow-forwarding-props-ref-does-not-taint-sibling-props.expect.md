
## Input

```javascript
// @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34775
 * Forwarding `props.ref` to a child component should not cause sibling
 * property reads from the same `props` object to be flagged as ref accesses.
 */
function Field(props) {
  return (
    <Control
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Field,
  params: [{placeholder: 'hello', disabled: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender

/**
 * Regression test for https://github.com/facebook/react/issues/34775
 * Forwarding `props.ref` to a child component should not cause sibling
 * property reads from the same `props` object to be flagged as ref accesses.
 */
function Field(props) {
  const $ = _c(4);
  let t0;
  if (
    $[0] !== props.disabled ||
    $[1] !== props.placeholder ||
    $[2] !== props.ref
  ) {
    t0 = (
      <Control
        ref={props.ref}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    );
    $[0] = props.disabled;
    $[1] = props.placeholder;
    $[2] = props.ref;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Field,
  params: [{ placeholder: "hello", disabled: false }],
};

```
      
### Eval output
(kind: exception) Control is not defined