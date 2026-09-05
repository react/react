
## Input

```javascript
// @gating

const FooBeforeDeclaration = Foo;

function callFoo() {
  'use no memo';
  return FooBeforeDeclaration('first', 'second');
}

function Foo(first) {
  'use memo';
  return [first, arguments[1], arguments.length];
}

export const FIXTURE_ENTRYPOINT = {
  fn: callFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating

const FooBeforeDeclaration = Foo;

function callFoo() {
  "use no memo";
  return FooBeforeDeclaration("first", "second");
}
const isForgetEnabled_Fixtures_result = isForgetEnabled_Fixtures();

function Foo_optimized(first) {
  "use memo";
  const $ = _c(2);
  let t0;
  if ($[0] !== first) {
    t0 = [first, arguments[1], arguments.length];
    $[0] = first;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}
function Foo_unoptimized(first) {
  "use memo";
  return [first, arguments[1], arguments.length];
}
function Foo(arg0) {
  if (isForgetEnabled_Fixtures_result)
    return Foo_optimized.apply(this, arguments);
  else return Foo_unoptimized.apply(this, arguments);
}

export const FIXTURE_ENTRYPOINT = {
  fn: callFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) ["first","second",2]