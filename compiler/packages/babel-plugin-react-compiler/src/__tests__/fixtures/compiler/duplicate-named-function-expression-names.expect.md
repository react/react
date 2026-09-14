
## Input

```javascript
export function Component({value}) {
  const columns = [
    {
      render: function Render(input) {
        const copy = input;
        return copy + value;
      },
    },
    {
      render: function Render(input) {
        const copy = input;
        return copy + value;
      },
    },
  ];
  return <div>{columns}</div>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export function Component(t0) {
  const $ = _c(2);
  const { value } = t0;
  let t1;
  if ($[0] !== value) {
    const columns = [
      {
        render: function Render(input) {
          const copy = input;
          return copy + value;
        },
      },
      {
        render: function Render(input_0) {
          const copy_0 = input_0;
          return copy_0 + value;
        },
      },
    ];
    t1 = <div>{columns}</div>;
    $[0] = value;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

```
      
### Eval output
(kind: exception) Fixture not implemented