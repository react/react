
## Input

```javascript
// @customMacros:"idx.*.b"

function Component(props) {
  // outlined
  const groupName1 = idx(props, _ => _.group.label);
  // outlined
  const groupName2 = idx.a(props, _ => _.group.label);
  // not outlined
  const groupName3 = idx.a.b(props, _ => _.group.label);
  // not outlined
  const groupName4 = idx.hello_world.b(props, _ => _.group.label);
  // outlined
  const groupName5 = idx.hello_world.b.c(props, _ => _.group.label);
  return (
    <div>
      {groupName1}
      {groupName2}
      {groupName3}
      {groupName4}
      {groupName5}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @customMacros:"idx.*.b"

function Component(props) {
  const $ = _c(16);
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
  if ($[6] !== props) {
    t3 = idx.hello_world.b(props, (__2) => __2.group.label);
    $[6] = props;
    $[7] = t3;
  } else {
    t3 = $[7];
  }
  const groupName4 = t3;
  let t4;
  if ($[8] !== props) {
    t4 = idx.hello_world.b.c(props, (__3) => __3.group.label);
    $[8] = props;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  const groupName5 = t4;
  let t5;
  if (
    $[10] !== groupName1 ||
    $[11] !== groupName2 ||
    $[12] !== groupName3 ||
    $[13] !== groupName4 ||
    $[14] !== groupName5
  ) {
    t5 = (
      <div>
        {groupName1}
        {groupName2}
        {groupName3}
        {groupName4}
        {groupName5}
      </div>
    );
    $[10] = groupName1;
    $[11] = groupName2;
    $[12] = groupName3;
    $[13] = groupName4;
    $[14] = groupName5;
    $[15] = t5;
  } else {
    t5 = $[15];
  }
  return t5;
}

```
      