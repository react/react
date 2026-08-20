
## Input

```javascript
function Component(props) {
  for (let i = 0; i < props.count; i++) {
    return;
  }
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
  for (const i = 0; 0 < props.count; ) {
    return;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      