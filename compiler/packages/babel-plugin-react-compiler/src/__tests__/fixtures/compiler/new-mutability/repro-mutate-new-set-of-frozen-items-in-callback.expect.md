
## Input

```javascript
// @enableNewMutationAliasingModel:true

export const App = () => {
  const [selected, setSelected] = useState(new Set<string>());
  const onSelectedChange = (value: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      // This should not count as a mutation of `selected`
      newSelected.delete(value);
    } else {
      // This should not count as a mutation of `selected`
      newSelected.add(value);
    }
    setSelected(newSelected);
  };

  return <Stringify selected={selected} onSelectedChange={onSelectedChange} />;
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel:true

export const App = () => {
  const $ = _c(6);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = new Set();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const [selected, setSelected] = useState(t0);
  let t1;
  if ($[1] !== selected) {
    t1 = (value) => {
      const newSelected = new Set(selected);
      if (newSelected.has(value)) {
        newSelected.delete(value);
      } else {
        newSelected.add(value);
      }

      setSelected(newSelected);
    };
    $[1] = selected;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const onSelectedChange = t1;
  let t2;
  if ($[3] !== onSelectedChange || $[4] !== selected) {
    t2 = <Stringify selected={selected} onSelectedChange={onSelectedChange} />;
    $[3] = onSelectedChange;
    $[4] = selected;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
};

```
      
### Eval output
(kind: exception) Fixture not implemented