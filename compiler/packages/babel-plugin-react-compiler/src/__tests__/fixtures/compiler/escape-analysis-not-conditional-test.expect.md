
## Input

```javascript
function Component(props) {
  const x = [props.a];
  const y = x ? props.b : props.c;
  return y;
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
  const x = [props.a];
  const y = x ? props.b : props.c;
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      