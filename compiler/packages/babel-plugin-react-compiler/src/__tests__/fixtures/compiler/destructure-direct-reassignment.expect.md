
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
function foo(props) {
  let x, y;
  ({x, y} = {x: props.a, y: props.b});
  console.log(x); // prevent DCE from eliminating `x` altogether
  x = props.c;
  return x + y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
function foo(props) {
  let x;
  let y;
  ({ x, y } = { x: props.a, y: props.b });
  console.log(x);
  x = props.c;
  return x + y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      