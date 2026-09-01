
## Input

```javascript
function foo(x) {
  let y;
  switch (x) {
    case 0: {
      y = 0;
    }
    case 1: {
      y = 1;
    }
    case 2: {
      break;
    }
    case 3: {
      y = 3;
      break;
    }
    case 4: {
      y = 4;
    }
    case 5: {
      y = 5;
    }
    default: {
      y = 0;
    }
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
function foo(x) {
  bb0: switch (x) {
    case 0:
    case 1:
    case 2: {
      break bb0;
    }
    case 3: {
      break bb0;
    }
    case 4:
    case 5:
    default:
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      