
## Input

```javascript
// @flow
function Component({items}) {
  const onClick = () => {
    const result = items.reduce(
      (acc, item) => {
        acc[item.order] = item;
        return acc;
      },
      ({}: {[displayOrder: number]: {order: number, name: string}})
    );
    submit(result);
  };
  return <Button onClick={onClick} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(2);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    const onClick = () => {
      const result = items.reduce(
        _temp,
        ({}: { [displayOrder: number]: { order: number, name: string } }),
      );
      submit(result);
    };
    t1 = <Button onClick={onClick} />;
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(acc, item) {
  acc[item.order] = item;
  return acc;
}

```
      
### Eval output
(kind: exception) Fixture not implemented