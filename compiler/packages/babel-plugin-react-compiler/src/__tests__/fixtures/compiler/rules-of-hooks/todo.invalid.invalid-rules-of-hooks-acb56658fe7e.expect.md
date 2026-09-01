
## Input

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

class C {
  m() {
    This.useHook();
    Super.useHook();
  }
}

```

## Code

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

class C {
  m() {
    This.useHook();
    Super.useHook();
  }
}

```
      