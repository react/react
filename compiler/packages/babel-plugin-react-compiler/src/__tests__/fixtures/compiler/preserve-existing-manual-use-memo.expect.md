
## Input

```javascript
// @enablePreserveExistingManualUseMemo
import {useCallback, useMemo} from 'react';

function Component({items, onSelect}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  const handleSelect = useCallback(item => onSelect(item), [onSelect]);
  return (
    <ul>
      {sorted.map(item => (
        <li key={item} onClick={() => handleSelect(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default Component;

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
// @enablePreserveExistingManualUseMemo
import { useCallback, useMemo } from 'react';
function Component(t0) {
  const $ = _c(13);
  const {
    items,
    onSelect
  } = t0;
  let t1;
  let t2;
  if ($[0] !== items) {
    t1 = () => [...items].sort();
    t2 = [items];
    $[0] = items;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  const sorted = useMemo(t1, t2);
  let t3;
  let t4;
  if ($[3] !== onSelect) {
    t3 = item => onSelect(item);
    t4 = [onSelect];
    $[3] = onSelect;
    $[4] = t3;
    $[5] = t4;
  } else {
    t3 = $[4];
    t4 = $[5];
  }
  const handleSelect = useCallback(t3, t4);
  let t5;
  if ($[6] !== handleSelect || $[7] !== sorted) {
    let t6;
    if ($[9] !== handleSelect) {
      t6 = item_0 => <li key={item_0} onClick={() => handleSelect(item_0)}>{item_0}</li>;
      $[9] = handleSelect;
      $[10] = t6;
    } else {
      t6 = $[10];
    }
    t5 = sorted.map(t6);
    $[6] = handleSelect;
    $[7] = sorted;
    $[8] = t5;
  } else {
    t5 = $[8];
  }
  let t6;
  if ($[11] !== t5) {
    t6 = <ul>{t5}</ul>;
    $[11] = t5;
    $[12] = t6;
  } else {
    t6 = $[12];
  }
  return t6;
}
export default Component;

```

### Eval output
(kind: exception) Fixture not implemented
