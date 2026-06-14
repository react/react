
## Input

```javascript
// @flow @compilationMode:"syntax"
// Component declarations nested inside object method bodies should be found
export const examples = [
  {
    title: 'Example 1',
    render(): React.MixedElement {
      component Demo1() {
        const x = useFoo();
        return <div>{x}</div>;
      }
      return <Demo1 />;
    },
  },
  {
    title: 'Example 2',
    render(): React.MixedElement {
      component Demo2() {
        const y = useBar();
        return <span>{y}</span>;
      }
      return <Demo2 />;
    },
  },
];

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";

export const examples = [
  {
    title: "Example 1",
    render(): React.MixedElement {
      function Demo1() {
        const $ = _c(2);
        const x = useFoo();
        let t0;
        if ($[0] !== x) {
          t0 = <div>{x}</div>;
          $[0] = x;
          $[1] = t0;
        } else {
          t0 = $[1];
        }
        return t0;
      }

      return <Demo1 />;
    },
  },
  {
    title: "Example 2",
    render(): React.MixedElement {
      function Demo2() {
        const $ = _c(2);
        const y = useBar();
        let t0;
        if ($[0] !== y) {
          t0 = <span>{y}</span>;
          $[0] = y;
          $[1] = t0;
        } else {
          t0 = $[1];
        }
        return t0;
      }

      return <Demo2 />;
    },
  },
];

```
      
### Eval output
(kind: exception) Fixture not implemented