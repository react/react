
## Input

```javascript
// The `\w` in the Flow suppression pattern is ASCII-only, so a non-ASCII character
// directly after `$FlowFixMe` means this is not a suppression and the function is
// still compiled.
function Component(props) {
  // $FlowFixMé[react-rule-hook]
  const x = [props.a];
  return <div>{x}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // The `\w` in the Flow suppression pattern is ASCII-only, so a non-ASCII character
// directly after `$FlowFixMe` means this is not a suppression and the function is
// still compiled.
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.a) {
    const x = [props.a];
    t0 = <div>{x}</div>;
    $[0] = props.a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1 }],
};

```
      
### Eval output
(kind: ok) <div>1</div>