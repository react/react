
## Input

```javascript
// @compilationMode(infer)

/**
 * Test that nested component-like functions are NOT compiled when parent has 'use no memo'.
 * This reproduces bug #35350 where 'use no memo' doesn't apply recursively.
 */
function ParentComponent(props) {
  'use no memo';

  // This nested function has a component-like name but should NOT be compiled
  // because the parent has 'use no memo'
  function NestedComponent() {
    return <div>{props.value}</div>;
  }

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
 * Test that nested component-like functions are NOT compiled when parent has 'use no memo'.
 * This reproduces bug #35350 where 'use no memo' doesn't apply recursively.
 */
function ParentComponent(props) {
  "use no memo";

  // This nested function has a component-like name but should NOT be compiled
  // because the parent has 'use no memo'
  function NestedComponent() {
    return <div>{props.value}</div>;
  }

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