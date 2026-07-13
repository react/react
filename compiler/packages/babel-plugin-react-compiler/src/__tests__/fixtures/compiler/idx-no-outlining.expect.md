
## Input

```javascript
// @customMacros:"idx"
import idx from 'idx';

function Component(props) {
  // the lambda should not be outlined
  const groupName = idx(props, _ => _.group.label);
  return <div>{groupName}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @customMacros:"idx"

function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props) {
    var _ref;
    t0 =
      (_ref = props) != null
        ? (_ref = _ref.group) != null
          ? _ref.label
          : _ref
        : _ref;
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const groupName = t0;
  let t1;
  if ($[2] !== groupName) {
    t1 = <div>{groupName}</div>;
    $[2] = groupName;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      
### Eval output
(kind: ok) <div></div>