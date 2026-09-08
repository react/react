
## Input

```javascript
// @flow @compilationMode(infer)
function Component(props: {items: Array<{isRead: boolean, id: string}>}) {
  const results = props.items.map(item => {
    const {isRead, id} = item;
    return ({
      isRead,
      id,
      label: isRead ? 'read' : 'unread',
    }: {
      isRead: boolean,
      id: string,
      label: string,
    });
  });
  return <div>{results.length}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(_temp);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const results = t0;
  let t1;
  if ($[2] !== results.length) {
    t1 = <div>{results.length}</div>;
    $[2] = results.length;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
function _temp(item) {
  const { isRead, id } = item;
  return ({ isRead, id, label: isRead ? "read" : "unread" }: {
    isRead: boolean,
    id: string,
    label: string,
  });
}

```
      
### Eval output
(kind: exception) Fixture not implemented