
## Input

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

(class {
  h = () => {
    useState();
  };
});

```

## Code

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

(class {
  h = () => {
    useState();
  };
});

```
      