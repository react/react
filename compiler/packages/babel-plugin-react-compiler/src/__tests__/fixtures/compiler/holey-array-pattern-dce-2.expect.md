
## Input

```javascript
function t(props) {
  let [foo, bar, ,] = props;
  return foo;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
function t(props) {
  const [foo] = props;
  return foo;
}

export const FIXTURE_ENTRYPOINT = {
  fn: t,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      