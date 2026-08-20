
## Input

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Regression test for some internal code.
// This shows how the "callback rule" is more relaxed,
// and doesn't kick in unless we're confident we're in
// a component or a hook.
function makeListener(instance) {
  each(pixelsWithInferredEvents, pixel => {
    if (useExtendedSelector(pixel.id) && extendedButton) {
      foo();
    }
  });
}

```

## Code

```javascript
// @expectNothingCompiled @compilationMode:"infer"
// Regression test for some internal code.
// This shows how the "callback rule" is more relaxed,
// and doesn't kick in unless we're confident we're in
// a component or a hook.
function makeListener(instance) {
  each(pixelsWithInferredEvents, (pixel) => {
    if (useExtendedSelector(pixel.id) && extendedButton) {
      foo();
    }
  });
}

```
      