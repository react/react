
## Input

```javascript
// @validateSourceLocations
const Component = () => {
  debugger;
  return 'ok';
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
// @validateSourceLocations
const Component = () => {
  debugger;
  return "ok";
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "ok"