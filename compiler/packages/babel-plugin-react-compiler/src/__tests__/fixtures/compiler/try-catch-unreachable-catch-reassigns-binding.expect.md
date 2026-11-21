
## Input

```javascript
// The try block cannot throw, so the catch handler is pruned. The handler
// conditionally reassigns `n`, so the block after the try/catch has a phi
// with an operand from a removed block. That operand must be pruned rather
// than tripping an invariant, and the result must be `1` (the catch never runs).
function Component() {
  let n = 0;
  try {
    const x = 1;
  } catch (e) {
    if (e) {
      n = 1;
    }
  }
  n = n + 1;
  return n;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
// The try block cannot throw, so the catch handler is pruned. The handler
// conditionally reassigns `n`, so the block after the try/catch has a phi
// with an operand from a removed block. That operand must be pruned rather
// than tripping an invariant, and the result must be `1` (the catch never runs).
function Component() {
  let n = 0;

  n = n + 1;
  return n;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 1