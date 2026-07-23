
## Input

```javascript
// Ensure HTML entity references in JSX text (e.g. &#32;) are preserved after
// compilation and not stripped as whitespace-only nodes.
function MyApp() {
  return (
    <div>
      &#32;
      <span>hello world</span>
    </div>
  );
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Ensure HTML entity references in JSX text (e.g. &#32;) are preserved after
// compilation and not stripped as whitespace-only nodes.
function MyApp() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = (
      <div>
        {"&#32;"}
        <span>hello world</span>
      </div>
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented