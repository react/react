
## Input

```javascript
// @flow
type Item = {id: string, name: string};

function Component({items}: {items: Array<Item>}) {
  const onClick = () => {
    const mapped: Array<Item> = items.map(item => ({
      id: item.id,
      name: item.name.toUpperCase(),
    }));
    submit(mapped);
  };
  return <Button onClick={onClick} />;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
type Item = { id: string, name: string };

function Component(t0) {
  const $ = _c(2);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    const onClick = () => {
      const mapped = items.map(_temp);
      submit(mapped);
    };
    t1 = <Button onClick={onClick} />;
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
function _temp(item) {
  return { id: item.id, name: item.name.toUpperCase() };
}

```
      
### Eval output
(kind: exception) Fixture not implemented