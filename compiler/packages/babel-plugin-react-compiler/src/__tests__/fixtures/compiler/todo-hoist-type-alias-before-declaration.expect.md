
## Input

```javascript
// @flow @compilationMode(infer)
function Component(props: {data: Array<{label: string, value: number}>}) {
  const getLabel = (item: ItemType): string => item.label;
  const items = props.data.map(getLabel);
  type ItemType = {label: string, value: number};
  return <div>{items}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  const getLabel = _temp;
  let t0;
  if ($[0] !== props.data) {
    t0 = props.data.map(getLabel);
    $[0] = props.data;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const items = t0;
  let t1;
  if ($[2] !== items) {
    t1 = <div>{items}</div>;
    $[2] = items;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(item) {
  return item.label;
}

```
      
### Eval output
(kind: exception) Fixture not implemented