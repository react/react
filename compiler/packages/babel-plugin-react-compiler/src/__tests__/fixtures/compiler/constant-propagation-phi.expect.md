
## Input

```javascript
function foo(a, b, c) {
  let x;
  if (a) {
    x = 2 - 1;
  } else {
    x = 0 + 1;
  }
  if (x === 1) {
    return b;
  } else {
    return c;
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
function foo(a, b, c) {
  if (a) {
  }

  return b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      