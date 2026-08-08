
## Input

```javascript
// @validateRefAccessDuringRender @compilationMode:"infer"

function Component(props) {
  return (
    <Field
      name={props.name}
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateRefAccessDuringRender @compilationMode:"infer"

function Component(props) {
  const $ = _c(5);
  let t0;
  if (
    $[0] !== props.disabled ||
    $[1] !== props.name ||
    $[2] !== props.placeholder ||
    $[3] !== props.ref
  ) {
    t0 = (
      <Field
        name={props.name}
        ref={props.ref}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    );
    $[0] = props.disabled;
    $[1] = props.name;
    $[2] = props.placeholder;
    $[3] = props.ref;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented