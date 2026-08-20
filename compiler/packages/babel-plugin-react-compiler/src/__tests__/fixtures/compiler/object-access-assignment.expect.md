
## Input

```javascript
function Component({a, b, c}) {
  // This is an object version of array-access-assignment.js
  // Meant to confirm that object expressions and PropertyStore/PropertyLoad with strings
  // works equivalently to array expressions and property accesses with numeric indices
  const x = {zero: a};
  const y = {zero: null, one: b};
  const z = {zero: {}, one: {}, two: {zero: c}};
  x.zero = y.one;
  z.zero.zero = x.zero;
  return {zero: x, one: z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: 1, b: 20, c: 300}],
  sequentialRenders: [
    {a: 2, b: 20, c: 300},
    {a: 3, b: 20, c: 300},
    {a: 3, b: 21, c: 300},
    {a: 3, b: 22, c: 300},
    {a: 3, b: 22, c: 301},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(6);
  const { a, b, c } = t0;
  let t1;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    const x = { zero: a };
    let t2;
    if ($[4] !== b) {
      t2 = { zero: null, one: b };
      $[4] = b;
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    const y = t2;
    const z = { zero: {}, one: {}, two: { zero: c } };
    x.zero = y.one;
    z.zero.zero = x.zero;
    t1 = { zero: x, one: z };
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ a: 1, b: 20, c: 300 }],
  sequentialRenders: [
    { a: 2, b: 20, c: 300 },
    { a: 3, b: 20, c: 300 },
    { a: 3, b: 21, c: 300 },
    { a: 3, b: 22, c: 300 },
    { a: 3, b: 22, c: 301 },
  ],
};

```
      
### Eval output
(kind: ok) {"zero":{"zero":20},"one":{"zero":{"zero":20},"one":{},"two":{"zero":300}}}
{"zero":{"zero":20},"one":{"zero":{"zero":20},"one":{},"two":{"zero":300}}}
{"zero":{"zero":21},"one":{"zero":{"zero":21},"one":{},"two":{"zero":300}}}
{"zero":{"zero":22},"one":{"zero":{"zero":22},"one":{},"two":{"zero":300}}}
{"zero":{"zero":22},"one":{"zero":{"zero":22},"one":{},"two":{"zero":301}}}