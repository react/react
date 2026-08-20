
## Input

```javascript
function Component(props) {
  let x = {};
  // onChange should be inferred as immutable, because the value
  // it captures (`x`) is frozen by the time the function is referenced
  const onChange = e => {
    maybeMutate(x, e.target.value);
  };
  if (props.cond) {
    <div>{x}</div>;
  }
  // ideally this call would be outside the memoization block for `x`
  onChange();
  return <Foo value={x} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.cond) {
    const x = {};
    const onChange = (e) => {
      maybeMutate(x, e.target.value);
    };
    if (props.cond) {
    }
    onChange();
    t0 = <Foo value={x} />;
    $[0] = props.cond;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      