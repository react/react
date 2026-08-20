
## Input

```javascript
// @skip
// Passed but should have failed

// Currently invalid because it violates the convention and removes the "taint"
// from a hook. We *could* make it valid to avoid some false positives but let's
// ensure that we don't break the "renderItem" and "normalFunctionWithConditionalHook"
// cases which must remain invalid.
function normalFunctionWithHook() {
  useHookInsideNormalFunction();
}

```

## Code

```javascript
// @skip
// Passed but should have failed

// Currently invalid because it violates the convention and removes the "taint"
// from a hook. We *could* make it valid to avoid some false positives but let's
// ensure that we don't break the "renderItem" and "normalFunctionWithConditionalHook"
// cases which must remain invalid.
function normalFunctionWithHook() {
  useHookInsideNormalFunction();
}

```
      