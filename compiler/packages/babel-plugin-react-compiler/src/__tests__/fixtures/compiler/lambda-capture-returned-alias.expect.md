
## Input

```javascript
// Here, element should not be memoized independently of aliasedElement, since
// it is captured by fn.
// AnalyzeFunctions currently does not find captured objects.
//  - mutated context refs are declared as `Capture` effect in `FunctionExpression.deps`
//  - all other context refs are left as Unknown. InferReferenceEffects currently demotes
//    them to reads
function CaptureNotMutate(props) {
  const idx = foo(props.x);
  const element = bar(props.el);

  const fn = function () {
    const arr = {element};
    return arr[idx];
  };
  const aliasedElement = fn();
  mutate(aliasedElement);
  return aliasedElement;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Here, element should not be memoized independently of aliasedElement, since
// it is captured by fn.
// AnalyzeFunctions currently does not find captured objects.
//  - mutated context refs are declared as `Capture` effect in `FunctionExpression.deps`
//  - all other context refs are left as Unknown. InferReferenceEffects currently demotes
//    them to reads
function CaptureNotMutate(props) {
  const $ = _c(5);
  let t0;
  if ($[0] !== props.x) {
    t0 = foo(props.x);
    $[0] = props.x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const idx = t0;
  let aliasedElement;
  if ($[2] !== idx || $[3] !== props.el) {
    const element = bar(props.el);
    const fn = function () {
      const arr = { element };
      return arr[idx];
    };
    aliasedElement = fn();
    mutate(aliasedElement);
    $[2] = idx;
    $[3] = props.el;
    $[4] = aliasedElement;
  } else {
    aliasedElement = $[4];
  }
  return aliasedElement;
}

```
      