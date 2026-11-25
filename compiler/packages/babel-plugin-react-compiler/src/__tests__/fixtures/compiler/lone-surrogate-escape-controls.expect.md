
## Input

```javascript
function foo() {
  'use memo';
  return [
    '\\uD800',
    '\\uDC00',
    '\\uD800\\uDC00',
    '\\\\uD800',
    '\\\\\\uDC00',
    '\\',
    '\\\\',
    '\\"',
    '𐀀',
    '\\𐀀',
    '\ud800\ud800',
    '\udc00\udc00',
    '\udc00\ud800',
    '\\uD800\udc00',
  ];
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo() {
  "use memo";
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [
      "\\uD800",
      "\\uDC00",
      "\\uD800\\uDC00",
      "\\\\uD800",
      "\\\\\\uDC00",
      "\\",
      "\\\\",
      '\\"',
      "\uD800\uDC00",
      "\\\uD800\uDC00",
      "\uD800\uD800",
      "\uDC00\uDC00",
      "\uDC00\uD800",
      "\\uD800\uDC00",
    ];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};

```
      
### Eval output
(kind: ok) ["\\uD800","\\uDC00","\\uD800\\uDC00","\\\\uD800","\\\\\\uDC00","\\","\\\\","\\\"","𐀀","\\𐀀","\ud800\ud800","\udc00\udc00","\udc00\ud800","\\uD800\udc00"]