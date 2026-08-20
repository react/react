
## Input

```javascript
// Forget currently bails out when it detects a potential mutation (Effect.Mutate)
// to an immutable value. This should not apply to unknown / untyped hooks.
function Component(props) {
  const x = useUnknownHook1(props);
  const y = useUnknownHook2(x);
  return y;
}

```

## Code

```javascript
// Forget currently bails out when it detects a potential mutation (Effect.Mutate)
// to an immutable value. This should not apply to unknown / untyped hooks.
function Component(props) {
  const x = useUnknownHook1(props);
  const y = useUnknownHook2(x);
  return y;
}

```
      