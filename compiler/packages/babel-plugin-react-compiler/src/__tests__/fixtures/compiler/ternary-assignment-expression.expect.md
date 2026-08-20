
## Input

```javascript
function ternary(props) {
  let x = 0;
  const y = props.a ? (x = 1) : (x = 2);
  return x + y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ternary,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
function ternary(props) {
  let x;
  const y = props.a ? (x = 1) : (x = 2);
  return x + y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ternary,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      