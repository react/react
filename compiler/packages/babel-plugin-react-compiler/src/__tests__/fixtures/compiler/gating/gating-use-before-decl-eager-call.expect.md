
## Input

```javascript
// @gating
const result = Foo(42);
function Foo(value) {
  'use memo';
  return value;
}

export const FIXTURE_ENTRYPOINT = {
  fn: () => result,
  params: [],
};

```

## Code

```javascript
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag";
const isForgetEnabled_Fixtures_result = isForgetEnabled_Fixtures(); // @gating
const result = Foo(42);
function Foo_optimized(value) {
  "use memo";

  return value;
}
function Foo_unoptimized(value) {
  "use memo";
  return value;
}
function Foo(arg0) {
  if (isForgetEnabled_Fixtures_result) return Foo_optimized(arg0);
  else return Foo_unoptimized(arg0);
}

export const FIXTURE_ENTRYPOINT = {
  fn: isForgetEnabled_Fixtures()
    ? () => {
        return result;
      }
    : () => result,
  params: [],
};

```
      
### Eval output
(kind: ok) 42