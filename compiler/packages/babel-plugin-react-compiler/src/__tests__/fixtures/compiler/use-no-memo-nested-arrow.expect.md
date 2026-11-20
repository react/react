
## Input

```javascript
// @compilationMode(infer)

/**
 * Test that nested arrow functions with component-like names are NOT compiled
 * when parent has 'use no memo'.
 */
function ParentComponent(props) {
  'use no memo';

  const NestedComponent = () => {
    return <div>{props.value}</div>;
  };

  return props.render(NestedComponent);
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [{value: 'test', render: C => C()}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @compilationMode(infer)

/**
 * Test that nested arrow functions with component-like names are NOT compiled
 * when parent has 'use no memo'.
 */
function ParentComponent(props) {
  "use no memo";

  const NestedComponent = () => {
    return <div>{props.value}</div>;
  };

  return props.render(NestedComponent);
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [
    {
      value: "test",
      render: (C) => {
        const $ = _c(2);
        let t0;
        if ($[0] !== C) {
          t0 = C();
          $[0] = C;
          $[1] = t0;
        } else {
          t0 = $[1];
        }
        return t0;
      },
    },
  ],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>test</div>