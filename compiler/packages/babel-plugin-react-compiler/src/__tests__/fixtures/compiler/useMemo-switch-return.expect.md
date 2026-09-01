
## Input

```javascript
// @validateExhaustiveMemoizationDependencies:false
function Component(props) {
  const x = useMemo(() => {
    let y;
    switch (props.switch) {
      case 'foo': {
        return 'foo';
      }
      case 'bar': {
        y = 'bar';
        break;
      }
      default: {
        y = props.y;
      }
    }
    return y;
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
    let y;
    bb1: switch (props.switch) {
      case "foo": {
        t0 = "foo";
        break bb0;
      }
      case "bar": {
        y = "bar";
        break bb1;
      }
      default: {
        y = props.y;
      }
    }
    t0 = y;
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
      