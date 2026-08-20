
## Input

```javascript
// @flow @compilationMode:"infer"
export default hook useFoo(bar: number) {
  return [bar];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [42],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export default function useFoo(bar) {
  const $ = _c(2);
  let t0;
  if ($[0] !== bar) {
    t0 = [bar];
    $[0] = bar;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [42],
};

```
      
### Eval output
(kind: ok) [42]