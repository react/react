
## Input

```javascript
// Valid because hooks can be used in anonymous function arguments to
// memo.
const MemoizedFunction = memo(function (props) {
  useHook();
  return <button {...props} />;
});

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Valid because hooks can be used in anonymous function arguments to
// memo.
const MemoizedFunction = memo(function (props) {
  const $ = _c(2);
  useHook();
  let t0;
  if ($[0] !== props) {
    t0 = <button {...props} />;
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
});

```
      