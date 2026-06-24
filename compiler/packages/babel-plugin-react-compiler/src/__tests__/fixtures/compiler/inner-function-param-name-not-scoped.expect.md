
## Input

```javascript
function Component({items}) {
  const mapped = items.map(item => {
    return {id: item.id, name: item.name};
  });
  return <List items={mapped} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(4);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp);
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const mapped = t1;
  let t2;
  if ($[2] !== mapped) {
    t2 = <List items={mapped} />;
    $[2] = mapped;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
}
function _temp(item) {
  return { id: item.id, name: item.name };
}

```
      
### Eval output
(kind: exception) Fixture not implemented