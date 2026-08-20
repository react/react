
## Input

```javascript
// @skip
// Passed but should have failed

// These are neither functions nor hooks.
function _normalFunctionWithHook() {
  useHookInsideNormalFunction();
}
function _useNotAHook() {
  useHookInsideNormalFunction();
}

```

## Code

```javascript
// @skip
// Passed but should have failed

// These are neither functions nor hooks.
function _normalFunctionWithHook() {
  useHookInsideNormalFunction();
}

function _useNotAHook() {
  useHookInsideNormalFunction();
}

```
      