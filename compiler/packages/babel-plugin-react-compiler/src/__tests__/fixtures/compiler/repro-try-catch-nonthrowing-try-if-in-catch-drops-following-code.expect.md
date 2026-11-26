
## Input

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38141
 *
 * When the try body cannot throw and the catch has nested control flow (e.g. if),
 * pruning the unreachable catch must not leave stale predecessors on the
 * fallthrough — otherwise the post-try continuation is never emitted.
 */
function Component() {
  try {
    const x = 1;
  } catch (e) {
    if (e) {
    }
  }
  return 'rendered';
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38141
 *
 * When the try body cannot throw and the catch has nested control flow (e.g. if),
 * pruning the unreachable catch must not leave stale predecessors on the
 * fallthrough — otherwise the post-try continuation is never emitted.
 */
function Component() {
  return "rendered";
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "rendered"