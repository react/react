
## Input

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Valid because hooks can use hooks.
function createHook() {
  return function useHookWithHook() {
    useHook();
  };
}

```

## Code

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Valid because hooks can use hooks.
function createHook() {
  return function useHookWithHook() {
    useHook();
  };
}

```
      