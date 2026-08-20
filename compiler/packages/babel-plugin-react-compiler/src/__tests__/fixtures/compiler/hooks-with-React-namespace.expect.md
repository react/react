
## Input

```javascript
function Component() {
  const [x, setX] = React.useState(1);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
function Component() {
  const [x] = React.useState(1);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) 1