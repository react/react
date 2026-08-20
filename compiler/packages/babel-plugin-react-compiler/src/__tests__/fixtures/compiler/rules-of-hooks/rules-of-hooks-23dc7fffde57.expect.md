
## Input

```javascript
// Valid because hooks can call hooks.
function useHook() {
  return useHook1() + useHook2();
}

```

## Code

```javascript
// Valid because hooks can call hooks.
function useHook() {
  return useHook1() + useHook2();
}

```
      