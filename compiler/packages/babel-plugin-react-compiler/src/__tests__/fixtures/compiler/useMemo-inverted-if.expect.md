
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    label: {
      if (props.cond) {
        break label;
      }
      return props.a;
    }
    return props.b;
  });
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  let t0;
  bb0: {
    bb1: {
      if (props.cond) {
        break bb1;
      }

      t0 = props.a;
      break bb0;
    }

    t0 = props.b;
  }
  const x = t0;

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      