
## Input

```javascript
// @compilationMode(infer)

/**
 * Test that explicit 'use memo' in nested function overrides parent's 'use no memo'.
 * The nested function SHOULD be compiled because it explicitly opts in.
 */
function ParentComponent(props) {
  'use no memo';

  // This should still be compiled because it explicitly opts in
  function NestedComponent() {
    'use memo';
    return <div>{props.value}</div>;
  }

  return <NestedComponent />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [{value: 'test'}],
  isComponent: true,
};

```

## Code

```javascript
// @compilationMode(infer)

/**
 * Test that explicit 'use memo' in nested function overrides parent's 'use no memo'.
 * The nested function SHOULD be compiled because it explicitly opts in.
 */
function ParentComponent(props) {
  "use no memo";

  // This should still be compiled because it explicitly opts in
  function NestedComponent() {
    "use memo";
    return <div>{props.value}</div>;
  }

  return <NestedComponent />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ParentComponent,
  params: [{ value: "test" }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>test</div>