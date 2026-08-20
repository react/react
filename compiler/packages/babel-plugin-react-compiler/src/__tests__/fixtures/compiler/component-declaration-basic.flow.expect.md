
## Input

```javascript
// @flow @compilationMode:"infer"
export default component Foo(bar: number) {
  return <Bar bar={bar} />;
}

component Bar(bar: number) {
  return <div>{bar}</div>;
}

function shouldNotCompile() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{bar: 42}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export default function Foo(t0) {
  const $ = _c(2);
  const { bar } = t0;
  let t1;
  if ($[0] !== bar) {
    t1 = <Bar bar={bar} />;
    $[0] = bar;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function Bar(t0) {
  const $ = _c(2);
  const { bar } = t0;
  let t1;
  if ($[0] !== bar) {
    t1 = <div>{bar}</div>;
    $[0] = bar;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

function shouldNotCompile() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ bar: 42 }],
};

```
      
### Eval output
(kind: ok) <div>42</div>