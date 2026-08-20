
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    switch (props.key) {
      case 'key': {
        return props.value;
      }
      default: {
        return props.defaultValue;
      }
    }
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
  bb0: switch (props.key) {
    case "key": {
      t0 = props.value;
      break bb0;
    }
    default: {
      t0 = props.defaultValue;
    }
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
      