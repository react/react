
## Input

```javascript
// @customMacros:"idx.a"

function Component(props) {
  // outlined
  const groupName1 = idx(props, _ => _.group.label);
  // not outlined
  const groupName2 = idx.a(props, _ => _.group.label);
  // outlined
  const groupName3 = idx.a.b(props, _ => _.group.label);
  return (
    <div>
      {groupName1}
      {groupName2}
      {groupName3}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @customMacros:"idx.a"

function Component(props) {
  const $ = _c(10);
  let t0;
  if ($[0] !== props) {
    t0 = idx(props, (_) => _.group.label);
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const groupName1 = t0;
  let t1;
  if ($[2] !== props) {
    t1 = idx.a(props, (__0) => __0.group.label);
    $[2] = props;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const groupName2 = t1;
  let t2;
  if ($[4] !== props) {
    t2 = idx.a.b(props, (__1) => __1.group.label);
    $[4] = props;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  const groupName3 = t2;
  let t3;
  if ($[6] !== groupName1 || $[7] !== groupName2 || $[8] !== groupName3) {
    t3 = (
      <div>
        {groupName1}
        {groupName2}
        {groupName3}
      </div>
    );
    $[6] = groupName1;
    $[7] = groupName2;
    $[8] = groupName3;
    $[9] = t3;
  } else {
    t3 = $[9];
  }
  return t3;
}

```
      