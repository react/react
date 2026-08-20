
## Input

```javascript
// @skip
// Passed but should have failed

// This is invalid because "use"-prefixed functions used in named
// functions are assumed to be hooks.
React.unknownFunction(function notAComponent(foo, bar) {
  useProbablyAHook(bar);
});

```

## Code

```javascript
// @skip
// Passed but should have failed

// This is invalid because "use"-prefixed functions used in named
// functions are assumed to be hooks.
React.unknownFunction(function notAComponent(foo, bar) {
  useProbablyAHook(bar);
});

```
      