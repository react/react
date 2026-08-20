
## Input

```javascript
// Valid because hooks can call hooks.
function useHook() {
  useState() && a;
}

```

## Code

```javascript
// Valid because hooks can call hooks.
function useHook() {
  useState() && a;
}

```
      