
## Input

```javascript
function Component([a = 2]) {
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
function Component(t0) {
  const [t1] = t0;
  const a = t1 === undefined ? 2 : t1;
  return a;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      