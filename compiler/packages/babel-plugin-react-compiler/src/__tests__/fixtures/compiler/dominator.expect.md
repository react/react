
## Input

```javascript
function Component(props) {
  let x = 0;
  label: if (props.a) {
    x = 1;
  } else {
    if (props.b) {
      x = 2;
    } else {
      break label;
    }
    x = 3;
  }
  label2: switch (props.c) {
    case 'a': {
      x = 4;
      break;
    }
    case 'b': {
      break label2;
    }
    case 'c': {
      x = 5;
      // intentional fallthrough
    }
    default: {
      x = 6;
    }
  }
  if (props.d) {
    return null;
  }
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
function Component(props) {
  let x = 0;
  bb0: if (props.a) {
    x = 1;
  } else {
    if (props.b) {
    } else {
      break bb0;
    }

    x = 3;
  }
  bb1: bb2: switch (props.c) {
    case "a": {
      x = 4;
      break bb2;
    }
    case "b": {
      break bb1;
    }
    case "c":
    default: {
      x = 6;
    }
  }
  if (props.d) {
    return null;
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      