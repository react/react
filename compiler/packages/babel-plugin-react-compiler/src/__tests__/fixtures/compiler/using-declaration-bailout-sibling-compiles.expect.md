
## Input

```javascript
// @panicThreshold:"none"
function ComponentWithUsing(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

function ValidComponent(props) {
  return <div>{props.greeting}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @panicThreshold:"none"
function ComponentWithUsing(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

function ValidComponent(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.greeting) {
    t0 = <div>{props.greeting}</div>;
    $[0] = props.greeting;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      