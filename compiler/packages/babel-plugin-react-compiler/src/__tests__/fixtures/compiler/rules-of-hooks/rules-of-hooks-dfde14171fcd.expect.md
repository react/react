
## Input

```javascript
// @expectNothingCompiled
// Valid because classes can call functions.
// We don't consider these to be hooks.
class C {
  m() {
    this.useHook();
    super.useHook();
  }
}

```

## Code

```javascript
// @expectNothingCompiled
// Valid because classes can call functions.
// We don't consider these to be hooks.
class C {
  m() {
    this.useHook();
    super.useHook();
  }
}

```
      