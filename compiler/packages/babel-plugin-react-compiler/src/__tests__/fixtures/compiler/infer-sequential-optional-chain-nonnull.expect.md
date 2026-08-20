
## Input

```javascript
function useFoo({a}) {
  let x = [];
  x.push(a?.b.c?.d.e);
  x.push(a.b?.c.d?.e);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [
    {a: null},
    {a: null},
    {a: {}},
    {a: {b: {c: {d: {e: 42}}}}},
    {a: {b: {c: {d: {e: 43}}}}},
    {a: {b: {c: {d: {e: undefined}}}}},
    {a: {b: undefined}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useFoo(t0) {
  const $ = _c(2);
  const { a } = t0;
  let x;
  if ($[0] !== a.b.c.d.e) {
    x = [];
    x.push(a?.b.c?.d.e);
    x.push(a.b?.c.d?.e);
    $[0] = a.b.c.d.e;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: null }],
  sequentialRenders: [
    { a: null },
    { a: null },
    { a: {} },
    { a: { b: { c: { d: { e: 42 } } } } },
    { a: { b: { c: { d: { e: 43 } } } } },
    { a: { b: { c: { d: { e: undefined } } } } },
    { a: { b: undefined } },
  ],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'c') ]]
[42,42]
[43,43]
[null,null]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'c') ]]