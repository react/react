
## Input

```javascript
function Component(props) {
  const {value} = props;
  const items = props.list.filter(value => value > 0);
  return (
    <div>
      {items.length}
      {value}
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(5);
  const { value } = props;
  let t0;
  if ($[0] !== props.list) {
    t0 = props.list.filter(_temp);
    $[0] = props.list;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const items = t0;
  let t1;
  if ($[2] !== items.length || $[3] !== value) {
    t1 = (
      <div>
        {items.length}
        {value}
      </div>
    );
    $[2] = items.length;
    $[3] = value;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}
function _temp(value_0) {
  return value_0 > 0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented