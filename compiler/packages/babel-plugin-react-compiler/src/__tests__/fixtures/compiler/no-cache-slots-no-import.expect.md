
## Input

```javascript
// @compilationMode(all)
function useMyHook({a, b}) {
  return a + b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [{a: 1, b: 2}],
};

```

## Code

```javascript
// @compilationMode(all)
function useMyHook(t0) {
  const { a, b } = t0;
  return a + b;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [{ a: 1, b: 2 }],
};

```
      
### Eval output
(kind: ok) 3